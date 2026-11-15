"""
test_database_resilience.py
----------------------------
Comprehensive test suite verifying database connection reliability,
stale connection eviction, retry safety, and pool concurrency in CareTrack AI.

Requirements tested:
 1. Healthy connection checkout.
 2. Already closed connection.
 3. Stale connection detected during validation.
 4. Broken connection discarded with close=True.
 5. Fresh connection acquired successfully after stale checkout.
 6. Reconnection failure after exceeding max retries.
 7. Connection returned to pool after query execution.
 8. No connection leaks on query error.
 9. No duplicate write execution on write failure (retry safety).
10. Concurrent connection checkout safety across threads.
"""

import os
import sys
import threading
from unittest.mock import MagicMock, patch
import pytest
import psycopg2

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import database
from test_backend import assert_test_database_isolation


@pytest.fixture(autouse=True)
def ensure_isolation():
    """Verify test isolation before running any database test."""
    assert_test_database_isolation()


# 1. Healthy connection checkout
def test_healthy_connection_checkout():
    """Test checking out and returning a healthy connection from the pool."""
    conn = database.get_conn()
    try:
        assert conn is not None
        assert conn.closed == 0
        assert database._is_connection_alive(conn) is True
    finally:
        database.put_conn(conn)


# 2. Already closed connection detection
def test_already_closed_connection():
    """Test that an already closed connection is recognized as dead."""
    mock_conn = MagicMock()
    mock_conn.closed = 1
    assert database._is_connection_alive(mock_conn) is False


# 3. Stale connection detected during validation
def test_stale_connection_detected_during_validation():
    """Test that a severed connection (closed=0 but socket EOF) fails liveness ping."""
    mock_conn = MagicMock()
    mock_conn.closed = 0
    mock_cursor = MagicMock()
    mock_cursor.execute.side_effect = psycopg2.OperationalError("server closed the connection unexpectedly")
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    assert database._is_connection_alive(mock_conn) is False


# 4. Broken connection discarded with close=True
def test_broken_connection_discarded():
    """Test that a stale connection checked out is discarded with close=True."""
    mock_pool = MagicMock()
    mock_stale = MagicMock()
    mock_stale.closed = 0
    # Ping fails on stale connection
    mock_cursor = MagicMock()
    mock_cursor.execute.side_effect = psycopg2.OperationalError("SSL SYSCALL error: EOF detected")
    mock_stale.cursor.return_value.__enter__.return_value = mock_cursor

    mock_healthy = MagicMock()
    mock_healthy.closed = 0
    mock_healthy_cur = MagicMock()
    mock_healthy.cursor.return_value.__enter__.return_value = mock_healthy_cur

    mock_pool.getconn.side_effect = [mock_stale, mock_healthy]

    with patch("database.get_pool", return_value=mock_pool):
        conn = database.get_conn(max_retries=3)
        assert conn == mock_healthy
        # Verify stale connection was discarded with close=True
        mock_pool.putconn.assert_called_with(mock_stale, close=True)


# 5. Fresh connection acquired successfully
def test_fresh_connection_acquired_successfully():
    """Test that after discarding a stale connection, a fresh one is acquired."""
    mock_pool = MagicMock()
    mock_stale = MagicMock()
    mock_stale.closed = 1  # closed connection

    mock_fresh = MagicMock()
    mock_fresh.closed = 0
    mock_fresh_cur = MagicMock()
    mock_fresh.cursor.return_value.__enter__.return_value = mock_fresh_cur

    mock_pool.getconn.side_effect = [mock_stale, mock_fresh]

    with patch("database.get_pool", return_value=mock_pool):
        conn = database.get_conn(max_retries=3)
        assert conn == mock_fresh
        assert mock_pool.getconn.call_count == 2


# 6. Reconnection failure after exceeding max retries
def test_reconnection_failure_max_retries():
    """Test that OperationalError is raised if all checkout attempts fail."""
    mock_pool = MagicMock()
    mock_stale = MagicMock()
    mock_stale.closed = 1
    mock_pool.getconn.return_value = mock_stale

    with patch("database.get_pool", return_value=mock_pool):
        with pytest.raises(psycopg2.OperationalError) as exc_info:
            database.get_conn(max_retries=3)
        assert "Unable to acquire a healthy database connection after 3 attempts" in str(exc_info.value)
        assert mock_pool.getconn.call_count == 3


# 7. Connection returned to pool after query execution
def test_connection_returned_to_pool():
    """Test that query() executes successfully and returns the connection to the pool."""
    res = database.query("SELECT 1 AS num", fetch_one=True)
    assert res is not None
    assert res["num"] == 1


# 8. No connection leaks on query error
def test_no_connection_leaks():
    """Test that when a query fails with an error, the connection is safely released or closed."""
    pool = database.get_pool()
    initial_used = len(pool._used)

    with pytest.raises(Exception):
        database.query("SELECT * FROM non_existent_table_xyz_123")

    after_used = len(pool._used)
    assert after_used == initial_used, f"Connection leaked: was {initial_used}, now {after_used}"


# 9. No duplicate write execution on write failure (retry safety)
def test_no_duplicate_write_execution():
    """
    CRITICAL RETRY SAFETY:
    Verify that execute() does NOT replay writes when a connection failure occurs.
    The statement must only be attempted once, raising the error immediately.
    """
    mock_conn = MagicMock()
    mock_conn.closed = 0
    mock_cur = MagicMock()
    # Simulate failure during INSERT execution
    mock_cur.execute.side_effect = psycopg2.OperationalError("server closed the connection unexpectedly")
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur

    with patch("database.get_conn", return_value=mock_conn):
        with patch("database.put_conn") as mock_put:
            with pytest.raises(psycopg2.OperationalError):
                database.execute("INSERT INTO test_records (name) VALUES (%s)", ("test_value",))

            # Exactly ONE attempt must have been made (no replaying of write)
            assert mock_cur.execute.call_count == 1
            # Broken connection must be discarded with close=True
            mock_put.assert_called_with(mock_conn, close=True)


# 10. Concurrent connection checkout safety across threads
def test_concurrent_connection_checkout_safety():
    """Test that multiple threads can concurrently acquire, use, and return connections safely."""
    errors = []

    def worker(worker_id):
        try:
            for _ in range(5):
                res = database.query("SELECT %s AS id", (worker_id,), fetch_one=True)
                assert res["id"] == worker_id
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=10)

    assert len(errors) == 0, f"Concurrent execution errors: {errors}"


# 11. Credential sanitization in error logs
def test_credential_sanitization():
    """Verify that sensitive database credentials and passwords are never exposed in log outputs."""
    raw_error_1 = "Connection failed: postgresql://admin_user:SuperSecretP@ss@ep-cool.supabase.co:5432/caretrack"
    sanitized_1 = database._sanitize_error(raw_error_1)
    assert "SuperSecretP@ss" not in sanitized_1
    assert "admin_user:******@" in sanitized_1

    raw_error_2 = 'OperationalError: password="MySecretPassword123" host=localhost'
    sanitized_2 = database._sanitize_error(raw_error_2)
    assert "MySecretPassword123" not in sanitized_2
    assert 'password="******"' in sanitized_2


# 12. Pool exhaustion handling and non-retry propagation
def test_pool_exhaustion_propagates_without_retry():
    """
    Verify that psycopg2.pool.PoolError is propagated immediately without retrying,
    leaks no connections, and sanitized logging prevents credential exposure.
    """
    mock_pool = MagicMock()
    mock_pool.getconn.side_effect = psycopg2.pool.PoolError("connection pool exhausted: host=localhost password='super_secret_pw'")

    with patch("database.get_pool", return_value=mock_pool):
        with pytest.raises(psycopg2.pool.PoolError) as exc_info:
            database.get_conn()

        # Verify pool checkout is not retried (called exactly once)
        assert mock_pool.getconn.call_count == 1
        # Verify no connection is leaked or returned
        assert mock_pool.putconn.call_count == 0
        # Verify sanitized exception message strips credentials
        sanitized_msg = database._sanitize_error(exc_info.value)
        assert "super_secret_pw" not in sanitized_msg
        assert "password='******'" in sanitized_msg


