"""
Background data collectors for Termux Performance Tracker.
Runs in separate threads, collecting system metrics at regular intervals
and storing them in the SQLite database.
"""

import threading
import time
import os
import json

from backend.database import get_db, rows_to_list
from backend.utils import (
    get_cpu_usage, get_memory_info, get_uptime, get_load_average,
    get_cpu_temperature, get_battery_status, get_process_count,
    get_network_speeds, get_network_latency, get_disk_usage,
    get_directory_size, check_port, get_file_info, get_processes
)
from backend.config import config


class CollectorManager:
    """Manages all background data collection threads."""

    def __init__(self):
        self.running = False
        self.threads = []
        self.refresh_interval = config.get('refresh_interval', 5)
        self._lock = threading.Lock()

        # Latest data cache (for quick API access without DB query)
        self.latest_metrics = {}
        self.latest_processes = []
        self.latest_interfaces = []
        self.latest_speeds = {}

    def start(self):
        """Start all collector threads."""
        if self.running:
            return
        self.running = True

        collectors = [
            ('SystemCollector', self._collect_system, self.refresh_interval),
            ('ProcessCollector', self._collect_processes, self.refresh_interval),
            ('NetworkCollector', self._collect_network, 3),
            ('StorageCollector', self._collect_storage, 60),
            ('PortCollector', self._collect_ports, 30),
            ('FileCollector', self._collect_files, 10),
            ('LatencyCollector', self._collect_latency, 30),
            ('CleanupCollector', self._cleanup_old_data, 3600),  # Every hour
        ]

        for name, func, interval in collectors:
            t = threading.Thread(target=self._run_collector, args=(name, func, interval), daemon=True)
            t.name = name
            t.start()
            self.threads.append(t)
            print(f"[Collector] Started {name} (interval: {interval}s)")

    def stop(self):
        """Stop all collectors."""
        self.running = False
        print("[Collector] Stopping all collectors...")

    def _run_collector(self, name, func, interval):
        """Run a collector function in a loop with the given interval."""
        # Small stagger to avoid all collectors hitting at once
        time.sleep(1)
        while self.running:
            try:
                func()
            except Exception as e:
                print(f"[{name}] Error: {e}")
            time.sleep(interval)

    def _collect_system(self):
        """Collect CPU, memory, uptime, temperature, battery, load average."""
        try:
            db = get_db()
            now = time.time()

            cpu = get_cpu_usage()
            mem = get_memory_info()
            uptime = get_uptime()
            load_avg = get_load_average()
            temp = get_cpu_temperature()
            battery = get_battery_status()
            proc_count = get_process_count()

            metrics = {
                'timestamp': now,
                'cpuUsage': cpu,
                'memoryUsage': mem['percent'],
                'memoryTotal': mem['total'],
                'memoryUsed': mem['used'],
                'swapTotal': mem['swap_total'],
                'swapUsed': mem['swap_used'],
                'uptime': uptime,
                'loadAvg': load_avg,
                'cpuTemp': temp,
                'batteryLevel': battery['level'],
                'batteryCharging': battery['charging'],
                'processCount': proc_count,
                'networkLatency': self.latest_metrics.get('networkLatency', 0)
            }

            with self._lock:
                self.latest_metrics = metrics

            # Store in database
            db.execute('''
                INSERT INTO system_metrics 
                (timestamp, cpu_percent, memory_percent, memory_used, memory_total,
                 swap_used, swap_total, uptime_seconds, load_avg_1, load_avg_5, load_avg_15,
                 cpu_temp, battery_percent, battery_charging, process_count, network_latency)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                now, cpu, mem['percent'], mem['used'], mem['total'],
                mem['swap_used'], mem['swap_total'], uptime,
                load_avg[0], load_avg[1], load_avg[2],
                temp, battery['level'], 1 if battery['charging'] else 0,
                proc_count, metrics['networkLatency']
            ))

            # Also store in CPU and memory history tables
            db.execute('INSERT INTO cpu_history (timestamp, cpu_percent, process_count) VALUES (?, ?, ?)',
                       (now, cpu, proc_count))
            db.execute('''
                INSERT INTO memory_history 
                (timestamp, memory_percent, memory_used, memory_total, swap_used, swap_total)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (now, mem['percent'], mem['used'], mem['total'], mem['swap_used'], mem['swap_total']))

            db.commit()

            # Check thresholds and create alerts
            self._check_thresholds(db, cpu, mem['percent'], battery)

        except Exception as e:
            print(f"[SystemCollector] Error: {e}")

    def _check_thresholds(self, db, cpu, mem_percent, battery):
        """Check if any thresholds are exceeded and create alerts."""
        now = time.time()
        cpu_threshold = config.get('cpu_threshold', 85)
        mem_threshold = config.get('memory_threshold', 80)

        # Check CPU spike
        if cpu > cpu_threshold:
            # Only alert if we haven't alerted in the last 60 seconds
            existing = db.execute(
                "SELECT id FROM alerts WHERE type='cpu_spike' AND timestamp > ? LIMIT 1",
                (now - 60,)
            ).fetchone()
            if not existing:
                db.execute('''
                    INSERT INTO alerts (timestamp, type, severity, message, details)
                    VALUES (?, 'cpu_spike', 'warning', ?, ?)
                ''', (now,
                      f'CPU usage at {cpu}% (threshold: {cpu_threshold}%)',
                      json.dumps({'cpu': cpu, 'threshold': cpu_threshold})))
                db.commit()

        # Check memory
        if mem_percent > mem_threshold:
            existing = db.execute(
                "SELECT id FROM alerts WHERE type='memory' AND timestamp > ? LIMIT 1",
                (now - 60,)
            ).fetchone()
            if not existing:
                db.execute('''
                    INSERT INTO alerts (timestamp, type, severity, message, details)
                    VALUES (?, 'memory', 'warning', ?, ?)
                ''', (now,
                      f'Memory usage at {mem_percent}% (threshold: {mem_threshold}%)',
                      json.dumps({'memory': mem_percent, 'threshold': mem_threshold})))
                db.commit()

        # Check battery
        if battery['level'] >= 0 and battery['level'] <= 15 and not battery['charging']:
            existing = db.execute(
                "SELECT id FROM alerts WHERE type='battery' AND timestamp > ? LIMIT 1",
                (now - 300,)
            ).fetchone()
            if not existing:
                db.execute('''
                    INSERT INTO alerts (timestamp, type, severity, message, details)
                    VALUES (?, 'battery', 'critical', ?, ?)
                ''', (now,
                      f'Battery low: {battery["level"]}%',
                      json.dumps({'level': battery['level']})))
                db.commit()

    def _collect_processes(self):
        """Collect process list snapshot."""
        try:
            db = get_db()
            now = time.time()
            processes = get_processes()

            with self._lock:
                self.latest_processes = processes

            # Clear old snapshots and insert new ones
            db.execute('DELETE FROM process_snapshots')
            for p in processes[:200]:  # Limit to top 200
                db.execute('''
                    INSERT INTO process_snapshots 
                    (timestamp, pid, name, cpu_percent, memory_percent, status, user_name, start_time, command)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (now, p['pid'], p['name'], p['cpu'], p['memory'],
                      p['status'], p['user'], p['startTime'], p['command']))
            db.commit()
        except Exception as e:
            print(f"[ProcessCollector] Error: {e}")

    def _collect_network(self):
        """Collect network interface speeds."""
        try:
            db = get_db()
            now = time.time()
            interfaces, speeds = get_network_speeds()

            with self._lock:
                self.latest_interfaces = interfaces
                self.latest_speeds = speeds

            # Store speed data for interfaces with activity
            for iface in interfaces:
                if iface['name'] in ('lo',):
                    continue  # Skip loopback for history
                db.execute('''
                    INSERT INTO network_history 
                    (timestamp, interface, bytes_recv, bytes_sent, speed_down, speed_up)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (now, iface['name'], iface['rxBytes'], iface['txBytes'],
                      iface['rxSpeed'], iface['txSpeed']))
            db.commit()
        except Exception as e:
            print(f"[NetworkCollector] Error: {e}")

    def _collect_storage(self):
        """Collect disk usage for monitored paths."""
        try:
            db = get_db()
            now = time.time()

            paths = db.execute('SELECT * FROM monitored_paths').fetchall()
            storage_threshold = config.get('storage_threshold', 90)

            for path_row in paths:
                path_id = path_row['id']
                path = path_row['path']
                threshold = path_row['threshold'] or storage_threshold

                if os.path.isdir(path):
                    usage = get_disk_usage(path)
                    used = usage['used']
                    total = usage['total']
                    percent = usage['percent']
                elif os.path.isfile(path):
                    size = os.path.getsize(path)
                    # For files, we show file size vs parent partition
                    parent_usage = get_disk_usage(os.path.dirname(path))
                    used = size
                    total = parent_usage['total']
                    percent = round((size / total) * 100, 2) if total > 0 else 0
                else:
                    # Path doesn't exist, try du
                    size = get_directory_size(path)
                    if size < 0:
                        continue
                    used = size
                    total = get_disk_usage('/')['total']
                    percent = round((size / total) * 100, 2) if total > 0 else 0

                db.execute('''
                    INSERT INTO storage_history (timestamp, path_id, used_bytes, total_bytes, percent)
                    VALUES (?, ?, ?, ?, ?)
                ''', (now, path_id, used, total, percent))

                # Check threshold
                if percent > threshold:
                    existing = db.execute(
                        "SELECT id FROM alerts WHERE type='storage' AND details LIKE ? AND timestamp > ?",
                        (f'%"path_id": {path_id}%', now - 300)
                    ).fetchone()
                    if not existing:
                        db.execute('''
                            INSERT INTO alerts (timestamp, type, severity, message, details)
                            VALUES (?, 'storage', 'warning', ?, ?)
                        ''', (now,
                              f'Storage for {path} at {percent}% (threshold: {threshold}%)',
                              json.dumps({'path_id': path_id, 'path': path, 'percent': percent})))

            db.commit()
        except Exception as e:
            print(f"[StorageCollector] Error: {e}")

    def _collect_ports(self):
        """Check status of monitored ports."""
        try:
            db = get_db()
            now = time.time()

            ports = db.execute('SELECT * FROM monitored_ports WHERE active = 1').fetchall()

            for port_row in ports:
                port_id = port_row['id']
                port = port_row['port']
                protocol = port_row['protocol']

                status, response_time = check_port(port, protocol)

                db.execute('''
                    INSERT INTO port_history (timestamp, port_id, status, response_time)
                    VALUES (?, ?, ?, ?)
                ''', (now, port_id, status, response_time))

                # Check for port down
                if status != 'open':
                    # Check previous status to avoid duplicate alerts
                    prev = db.execute(
                        'SELECT status FROM port_history WHERE port_id = ? AND timestamp < ? ORDER BY timestamp DESC LIMIT 1',
                        (port_id, now)
                    ).fetchone()
                    if prev and prev['status'] == 'open':
                        db.execute('''
                            INSERT INTO alerts (timestamp, type, severity, message, details)
                            VALUES (?, 'port_down', 'critical', ?, ?)
                        ''', (now,
                              f'Port {port}/{protocol} is {status}',
                              json.dumps({'port_id': port_id, 'port': port, 'protocol': protocol})))

            db.commit()
        except Exception as e:
            print(f"[PortCollector] Error: {e}")

    def _collect_files(self):
        """Monitor files for changes."""
        try:
            db = get_db()
            now = time.time()

            files = db.execute('SELECT * FROM monitored_files WHERE active = 1').fetchall()

            for file_row in files:
                file_id = file_row['id']
                path = file_row['path']
                last_modified = file_row['last_modified']
                last_size = file_row['last_size']

                info = get_file_info(path)

                if not info['exists']:
                    if last_modified > 0:
                        # File was deleted
                        db.execute('''
                            INSERT INTO file_events (file_id, timestamp, event_type, content_snippet)
                            VALUES (?, ?, 'deleted', 'File was deleted or is no longer accessible')
                        ''', (file_id, now))
                        db.execute('UPDATE monitored_files SET last_modified = 0, last_size = 0 WHERE id = ?',
                                   (file_id,))
                    continue

                if last_modified == 0 and info['modified'] > 0:
                    # File appeared (created or first seen)
                    db.execute('''
                        INSERT INTO file_events (file_id, timestamp, event_type, content_snippet)
                        VALUES (?, ?, 'created', ?)
                    ''', (file_id, now, f'File size: {info["size"]} bytes'))
                elif info['modified'] > last_modified:
                    # File was modified
                    snippet = ''
                    if info['is_file'] and info['size'] < 1048576:  # Only read if < 1MB
                        try:
                            from backend.utils import read_file_content
                            lines = read_file_content(path, lines=3)
                            snippet = ''.join(lines)[:500]
                        except Exception:
                            snippet = f'Size changed: {last_size} -> {info["size"]}'
                    else:
                        snippet = f'Size: {info["size"]} bytes'

                    db.execute('''
                        INSERT INTO file_events (file_id, timestamp, event_type, content_snippet)
                        VALUES (?, ?, 'modified', ?)
                    ''', (file_id, now, snippet))

                # Update tracked state
                db.execute('UPDATE monitored_files SET last_modified = ?, last_size = ? WHERE id = ?',
                           (info['modified'], info['size'], file_id))

            db.commit()
        except Exception as e:
            print(f"[FileCollector] Error: {e}")

    def _collect_latency(self):
        """Collect network latency measurement."""
        try:
            db = get_db()
            now = time.time()

            latency = get_network_latency()
            with self._lock:
                self.latest_metrics['networkLatency'] = latency if latency >= 0 else 0

            if latency >= 0:
                db.execute('''
                    INSERT INTO latency_history (timestamp, latency_ms, target)
                    VALUES (?, ?, '8.8.8.8')
                ''', (now, latency))
                db.commit()
        except Exception as e:
            print(f"[LatencyCollector] Error: {e}")

    def _cleanup_old_data(self):
        """Periodically clean up old data based on retention policy."""
        try:
            from backend.database import cleanup_old_data
            retention = config.get('data_retention_days', 30)
            cleanup_old_data(retention)
        except Exception as e:
            print(f"[CleanupCollector] Error: {e}")


# Global collector manager instance
collector_manager = CollectorManager()
