"""
database.py
-----------
PostgreSQL connection pool and helper functions for CareTrack AI.
Supports discrete DB environment variables or a unified DATABASE_URL (e.g. Supabase, Render).
"""

import os
import psycopg2
from psycopg2 import pool, extras
from dotenv import load_dotenv

# Ensure local .env in Backend/ is loaded if present
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
load_dotenv()

# -- Connection Pool -----------------------------------------------------------
_pool = None


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
    """Get or create the connection pool."""
    global _pool
    if _pool is None or _pool.closed:
        dsn_params = _get_dsn()
        _pool = pool.ThreadedConnectionPool(1, 10, **dsn_params)
    return _pool


def get_conn():
    """Get a connection from the pool."""
    return get_pool().getconn()


def put_conn(conn):
    """Return a connection to the pool."""
    get_pool().putconn(conn)


def query(sql, params=None, fetch_one=False, fetch_all=False):
    """Execute a query and optionally fetch results."""
    conn = get_conn()
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
        conn.rollback()
        raise e
    finally:
        put_conn(conn)


def execute(sql, params=None):
    """Execute a statement (INSERT/UPDATE/DELETE) and return affected rows."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
            return cur.rowcount
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        put_conn(conn)


def execute_returning(sql, params=None):
    """Execute a statement with RETURNING clause and return the result."""
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            result = cur.fetchone()
            conn.commit()
            return result
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        put_conn(conn)
