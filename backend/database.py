"""
SQLite database setup and helper functions for Termux Performance Tracker.
All tables for metrics, alerts, monitored items, etc.
"""

import sqlite3
import os
import json
import time
import threading

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
DB_PATH = os.path.join(DB_DIR, 'termux_monitor.db')

# Thread-local storage for connections
_local = threading.local()


def get_db():
    """Get a thread-local database connection."""
    if not hasattr(_local, 'connection') or _local.connection is None:
        os.makedirs(DB_DIR, exist_ok=True)
        _local.connection = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.connection.row_factory = sqlite3.Row
        _local.connection.execute("PRAGMA journal_mode=WAL")
        _local.connection.execute("PRAGMA busy_timeout=5000")
    return _local.connection


def close_db():
    """Close the thread-local database connection."""
    if hasattr(_local, 'connection') and _local.connection:
        _local.connection.close()
        _local.connection = None


def init_db():
    """Initialize all database tables."""
    db = get_db()
    cursor = db.cursor()

    # System metrics - periodic snapshots
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            cpu_percent REAL DEFAULT 0,
            memory_percent REAL DEFAULT 0,
            memory_used INTEGER DEFAULT 0,
            memory_total INTEGER DEFAULT 0,
            swap_used INTEGER DEFAULT 0,
            swap_total INTEGER DEFAULT 0,
            uptime_seconds REAL DEFAULT 0,
            load_avg_1 REAL DEFAULT 0,
            load_avg_5 REAL DEFAULT 0,
            load_avg_15 REAL DEFAULT 0,
            cpu_temp REAL DEFAULT 0,
            battery_percent REAL DEFAULT -1,
            battery_charging INTEGER DEFAULT 0,
            process_count INTEGER DEFAULT 0,
            network_latency REAL DEFAULT 0
        )
    ''')

    # CPU history (high frequency)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cpu_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            cpu_percent REAL DEFAULT 0,
            process_count INTEGER DEFAULT 0
        )
    ''')

    # Memory history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS memory_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            memory_percent REAL DEFAULT 0,
            memory_used INTEGER DEFAULT 0,
            memory_total INTEGER DEFAULT 0,
            swap_used INTEGER DEFAULT 0,
            swap_total INTEGER DEFAULT 0
        )
    ''')

    # Network history per interface
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS network_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            interface TEXT NOT NULL,
            bytes_recv INTEGER DEFAULT 0,
            bytes_sent INTEGER DEFAULT 0,
            speed_down REAL DEFAULT 0,
            speed_up REAL DEFAULT 0
        )
    ''')

    # Network latency history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS latency_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            latency_ms REAL DEFAULT 0,
            target TEXT DEFAULT '8.8.8.8'
        )
    ''')

    # User-monitored paths
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS monitored_paths (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            label TEXT DEFAULT '',
            threshold REAL DEFAULT 80,
            created_at REAL NOT NULL
        )
    ''')

    # Storage usage history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS storage_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            path_id INTEGER NOT NULL,
            used_bytes INTEGER DEFAULT 0,
            total_bytes INTEGER DEFAULT 0,
            percent REAL DEFAULT 0,
            FOREIGN KEY (path_id) REFERENCES monitored_paths(id)
        )
    ''')

    # User-monitored ports
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS monitored_ports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            port INTEGER NOT NULL,
            protocol TEXT DEFAULT 'tcp',
            description TEXT DEFAULT '',
            active INTEGER DEFAULT 1,
            created_at REAL NOT NULL
        )
    ''')

    # Port status history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS port_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            port_id INTEGER NOT NULL,
            status TEXT DEFAULT 'unknown',
            response_time REAL DEFAULT 0,
            FOREIGN KEY (port_id) REFERENCES monitored_ports(id)
        )
    ''')

    # Alerts
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            type TEXT NOT NULL,
            severity TEXT DEFAULT 'info',
            message TEXT NOT NULL,
            details TEXT DEFAULT '',
            acknowledged INTEGER DEFAULT 0,
            note TEXT DEFAULT ''
        )
    ''')

    # Process snapshots (latest only, replaced each cycle)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS process_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            pid INTEGER NOT NULL,
            name TEXT DEFAULT '',
            cpu_percent REAL DEFAULT 0,
            memory_percent REAL DEFAULT 0,
            status TEXT DEFAULT 'running',
            user_name TEXT DEFAULT '',
            start_time TEXT DEFAULT '',
            command TEXT DEFAULT ''
        )
    ''')

    # Process action log
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS process_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp REAL NOT NULL,
            pid INTEGER NOT NULL,
            process_name TEXT DEFAULT '',
            action TEXT NOT NULL,
            result TEXT DEFAULT ''
        )
    ''')

    # Scripts
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scripts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT NOT NULL,
            description TEXT DEFAULT '',
            tags TEXT DEFAULT '[]',
            created_at REAL NOT NULL,
            last_run_status TEXT DEFAULT 'never',
            last_run_time REAL DEFAULT 0
        )
    ''')

    # Script executions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS script_executions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            script_id INTEGER NOT NULL,
            pid INTEGER DEFAULT 0,
            start_time REAL NOT NULL,
            end_time REAL DEFAULT 0,
            status TEXT DEFAULT 'running',
            output TEXT DEFAULT '',
            error TEXT DEFAULT '',
            exit_code INTEGER DEFAULT -1,
            FOREIGN KEY (script_id) REFERENCES scripts(id)
        )
    ''')

    # Monitored files
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS monitored_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            description TEXT DEFAULT '',
            active INTEGER DEFAULT 1,
            created_at REAL NOT NULL,
            last_modified REAL DEFAULT 0,
            last_size INTEGER DEFAULT 0
        )
    ''')

    # File events
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS file_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL,
            timestamp REAL NOT NULL,
            event_type TEXT NOT NULL,
            content_snippet TEXT DEFAULT '',
            FOREIGN KEY (file_id) REFERENCES monitored_files(id)
        )
    ''')

    # Cron jobs (user-managed via UI)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cron_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            schedule TEXT NOT NULL,
            command TEXT NOT NULL,
            description TEXT DEFAULT '',
            active INTEGER DEFAULT 1,
            created_at REAL NOT NULL,
            last_run REAL DEFAULT 0,
            next_run REAL DEFAULT 0
        )
    ''')

    # Login sessions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS login_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time REAL NOT NULL,
            end_time REAL DEFAULT 0,
            ip_address TEXT DEFAULT '127.0.0.1'
        )
    ''')

    # Create indexes for performance
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_system_metrics_ts ON system_metrics(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_cpu_history_ts ON cpu_history(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_memory_history_ts ON memory_history(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_network_history_ts ON network_history(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_ts ON alerts(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_storage_history_ts ON storage_history(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_port_history_ts ON port_history(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_file_events_ts ON file_events(timestamp)')

    db.commit()
    print("[Database] All tables initialized successfully.")


def cleanup_old_data(retention_days=30):
    """Remove data older than retention_days."""
    db = get_db()
    cutoff = time.time() - (retention_days * 86400)

    tables_with_timestamp = [
        'system_metrics', 'cpu_history', 'memory_history',
        'network_history', 'latency_history', 'storage_history',
        'port_history', 'file_events', 'process_snapshots'
    ]

    for table in tables_with_timestamp:
        try:
            db.execute(f'DELETE FROM {table} WHERE timestamp < ?', (cutoff,))
        except Exception as e:
            print(f"[Database] Error cleaning {table}: {e}")

    db.commit()
    print(f"[Database] Cleaned up data older than {retention_days} days.")


def dict_from_row(row):
    """Convert a sqlite3.Row to a dictionary."""
    if row is None:
        return None
    return dict(row)


def rows_to_list(rows):
    """Convert a list of sqlite3.Row objects to a list of dicts."""
    return [dict(row) for row in rows]
