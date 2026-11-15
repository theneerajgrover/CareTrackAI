"""
database.py
-----------
PostgreSQL connection pool and helper functions for CareTrack AI.
Supports discrete DB environment variables or a unified DATABASE_URL (e.g. Supabase, Render).
Includes automatic connection validation, stale socket eviction, and transaction safety.
"""

import os
import re
import logging
import threading
import psycopg2
from psycopg2 import pool, extras
from dotenv import load_dotenv

logger = logging.getLogger("caretrack.database")

# Ensure local .env in Backend/ is loaded if present
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
load_dotenv()


# -- Sanitization & Liveness Helpers ------------------------------------------

def _sanitize_error(error_or_msg):
    """Strip database passwords and sensitive connection parameters from log messages."""
    text = str(error_or_msg)
    # Mask postgresql://user:password@host
    text = re.sub(r"://([^:]+):([^@]+)@", r"://\1:******@", text)
    # Mask password=xyz or password='xyz'
    text = re.sub(r"(password\s*=\s*['\"]?)([^'\";\s]+)(['\"]?)", r"\g<1>******\g<3>", text, flags=re.IGNORECASE)
    return text


def _is_connection_error(exc):
    """Determine whether an exception indicates a severed, dropped, or invalid connection."""
    if isinstance(exc, (psycopg2.OperationalError, psycopg2.InterfaceError)):
        return True
    msg = str(exc).lower()
    return any(err in msg for err in [
        "closed", "terminated", "broken pipe", "connection reset", "eof detected"
    ])


def _is_connection_alive(conn):
    """
    Validate connection liveness before application queries.
    Detects closed, stale, or server-severed sockets without mutating transaction state.
    """
    if conn is None or getattr(conn, "closed", 0) != 0:
        return False
    try:
        # Reset any leftover aborted/in-progress transaction state
        if conn.info.transaction_status != psycopg2.extensions.TRANSACTION_STATUS_IDLE:
            conn.rollback()
        # Fast query ping to verify network socket liveness
        with conn.cursor() as cur:
            cur.execute("SELECT 1;")
            cur.fetchone()
        conn.commit()
        return True
    except Exception:
        return False


# -- Connection Pool -----------------------------------------------------------
_pool = None
_pool_lock = threading.Lock()


def _get_dsn():
    """Build connection parameters from discrete environment variables or DATABASE_URL."""
    # Discrete variables avoid URL-encoding issues with passwords containing '@' or special chars
    if os.getenv("DB_HOST") and os.getenv("DB_PASSWORD"):
        return {
            "host": os.getenv("DB_HOST", "localhost"),
            "port": os.getenv("DB_PORT", "5432"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASSWORD", ""),
            "dbname": os.getenv("DB_NAME", "caretrack_ai"),
        }

    db_url = os.getenv("DATABASE_URL", "").strip()
    if db_url:
        # Standardize prefix for psycopg2 compatibility
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        return {"dsn": db_url}

    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": os.getenv("DB_PORT", "5432"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", ""),
        "dbname": os.getenv("DB_NAME", "caretrack_ai"),
    }


def get_pool():
    """Get or create the thread-safe connection pool."""
    global _pool
    if _pool is None or _pool.closed:
        with _pool_lock:
            if _pool is None or _pool.closed:
                dsn_params = _get_dsn()
                _pool = pool.ThreadedConnectionPool(1, 10, **dsn_params)
    return _pool


def close_pool():
    """Close all connections in the pool and reset."""
    global _pool
    with _pool_lock:
        if _pool is not None and not _pool.closed:
            _pool.closeall()
        _pool = None


def get_conn(max_retries=3):
    """
    Get a validated, healthy connection from the pool.
    Detects and safely discards stale or closed connections, acquiring a fresh one.
    Reconnection attempts are strictly limited to max_retries.
    """
    p = get_pool()
    for attempt in range(1, max_retries + 1):
        try:
            conn = p.getconn()
        except Exception as e:
            logger.error("Failed to checkout connection from pool: %s", _sanitize_error(e))
            raise e

        if _is_connection_alive(conn):
            return conn

        # Stale or broken connection detected: discard it safely using the pool's close mechanism
        logger.warning(
            "Discarding stale or unresponsive database connection from pool (attempt %d/%d).",
            attempt,
            max_retries,
        )
        try:
            p.putconn(conn, close=True)
        except Exception as e:
            logger.warning("Error closing stale connection from pool: %s", _sanitize_error(e))
            try:
                if not getattr(conn, "closed", 0):
                    conn.close()
            except Exception:
                pass

    raise psycopg2.OperationalError(
        f"Unable to acquire a healthy database connection after {max_retries} attempts."
    )


def put_conn(conn, close=False):
    """Return a connection to the pool or discard it if close=True or broken."""
    if conn is None:
        return
    p = get_pool()
    should_close = close or getattr(conn, "closed", 0) != 0
    try:
        p.putconn(conn, close=should_close)
    except Exception as e:
        logger.warning("Error returning connection to pool (close=%s): %s", should_close, _sanitize_error(e))
        if should_close:
            try:
                if not getattr(conn, "closed", 0):
                    conn.close()
            except Exception:
                pass


def query(sql, params=None, fetch_one=False, fetch_all=False):
    """Execute a query and optionally fetch results."""
    conn = get_conn()
    is_broken = False
    try:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            if fetch_one:
                result = cur.fetchone()
            elif fetch_all:
                result = cur.fetchall()
            else:
                result = None
            conn.commit()
            return result
    except Exception as e:
        is_broken = _is_connection_error(e) or getattr(conn, "closed", 0) != 0
        if not is_broken:
            try:
                conn.rollback()
            except Exception:
                is_broken = True
        logger.error("Database query error: %s", _sanitize_error(e))
        raise e
    finally:
        put_conn(conn, close=is_broken)


def execute(sql, params=None):
    """
    Execute a statement (INSERT/UPDATE/DELETE) and return affected rows.
    Write operations are never replayed on connection failure to avoid duplicates.
    """
    conn = get_conn()
    is_broken = False
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
            return cur.rowcount
    except Exception as e:
        is_broken = _is_connection_error(e) or getattr(conn, "closed", 0) != 0
        if not is_broken:
            try:
                conn.rollback()
            except Exception:
                is_broken = True
        logger.error("Database execute error: %s", _sanitize_error(e))
        raise e
    finally:
        put_conn(conn, close=is_broken)


def execute_returning(sql, params=None):
    """
    Execute a statement with RETURNING clause and return the result.
    Write operations are never replayed on connection failure to avoid duplicates.
    """
    conn = get_conn()
    is_broken = False
    try:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            result = cur.fetchone()
            conn.commit()
            return result
    except Exception as e:
        is_broken = _is_connection_error(e) or getattr(conn, "closed", 0) != 0
        if not is_broken:
            try:
                conn.rollback()
            except Exception:
                is_broken = True
        logger.error("Database execute_returning error: %s", _sanitize_error(e))
        raise e
    finally:
        put_conn(conn, close=is_broken)


def execute_transaction(operations):
    """
    Execute a sequence of (sql, params) statements atomically within a single transaction.
    Rolls back completely if any statement fails.
    """
    conn = get_conn()
    is_broken = False
    try:
        with conn.cursor() as cur:
            for sql, params in operations:
                cur.execute(sql, params)
            conn.commit()
    except Exception as e:
        is_broken = _is_connection_error(e) or getattr(conn, "closed", 0) != 0
        if not is_broken:
            try:
                conn.rollback()
            except Exception:
                is_broken = True
        logger.error("Database transaction error: %s", _sanitize_error(e))
        raise e
    finally:
        put_conn(conn, close=is_broken)
