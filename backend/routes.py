"""
Flask API routes for Termux Performance Tracker.
All endpoints are prefixed with /api/.
"""

import json
import time
import os
import signal

from flask import Blueprint, request, jsonify
from backend.database import get_db, rows_to_list, dict_from_row, cleanup_old_data
from backend.config import config, save_config, load_config
from backend.utils import (
    kill_process, get_disk_usage, get_directory_size,
    read_file_content, run_script, stop_script, get_script_output,
    check_port, get_crontab, set_crontab, export_data,
    send_termux_notification, format_uptime
)
from backend.collector import collector_manager

api = Blueprint('api', __name__, url_prefix='/api')


# ──────────────────────────────────────────────
# AUTH
# ──────────────────────────────────────────────

@api.route('/auth/login', methods=['POST'])
def auth_login():
    """Login endpoint."""
    data = request.get_json() or {}
    username = data.get('username', '')
    password = data.get('password', '')

    cfg = load_config()
    if username == cfg.get('username', 'admin') and password == cfg.get('password', 'More@123'):
        # Record login session
        db = get_db()
        db.execute('INSERT INTO login_sessions (start_time, ip_address) VALUES (?, ?)',
                   (time.time(), request.remote_addr or '127.0.0.1'))
        db.commit()
        return jsonify({'success': True, 'message': 'Login successful'})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401


@api.route('/auth/check', methods=['GET'])
def auth_check():
    """Check auth configuration."""
    cfg = load_config()
    return jsonify({
        'loginEnabled': cfg.get('login', 'on') == 'on',
        'username': cfg.get('username', 'admin')
    })


# ──────────────────────────────────────────────
# SYSTEM OVERVIEW
# ──────────────────────────────────────────────

@api.route('/system/overview', methods=['GET'])
def system_overview():
    """Get current system metrics snapshot."""
    metrics = collector_manager.latest_metrics
    if not metrics:
        return jsonify({'error': 'No data collected yet. Please wait a few seconds.'}), 503

    return jsonify({
        'cpuUsage': metrics.get('cpuUsage', 0),
        'memoryUsage': metrics.get('memoryUsage', 0),
        'memoryTotal': metrics.get('memoryTotal', 0),
        'memoryUsed': metrics.get('memoryUsed', 0),
        'swapTotal': metrics.get('swapTotal', 0),
        'swapUsed': metrics.get('swapUsed', 0),
        'uptime': metrics.get('uptime', 0),
        'loadAvg': metrics.get('loadAvg', [0, 0, 0]),
        'cpuTemp': metrics.get('cpuTemp', 0),
        'batteryLevel': metrics.get('batteryLevel', -1),
        'batteryCharging': metrics.get('batteryCharging', False),
        'processCount': metrics.get('processCount', 0),
        'networkLatency': metrics.get('networkLatency', 0),
        'timestamp': metrics.get('timestamp', time.time())
    })


# ──────────────────────────────────────────────
# CPU HISTORY
# ──────────────────────────────────────────────

@api.route('/cpu/history', methods=['GET'])
def cpu_history():
    """Get CPU usage history."""
    db = get_db()
    limit = request.args.get('limit', 60, type=int)
    rows = db.execute(
        'SELECT timestamp, cpu_percent, process_count FROM cpu_history ORDER BY timestamp DESC LIMIT ?',
        (limit,)
    ).fetchall()
    data = rows_to_list(rows)
    data.reverse()  # Oldest first

    result = []
    for row in data:
        t = time.localtime(row['timestamp'])
        result.append({
            'time': time.strftime('%H:%M:%S', t),
            'value': row['cpu_percent'],
            'cpu': row['cpu_percent'],
            'processes': row['process_count']
        })
    return jsonify(result)


# ──────────────────────────────────────────────
# MEMORY HISTORY
# ──────────────────────────────────────────────

@api.route('/memory/history', methods=['GET'])
def memory_history():
    """Get memory usage history."""
    db = get_db()
    limit = request.args.get('limit', 60, type=int)
    rows = db.execute(
        'SELECT timestamp, memory_percent, memory_used, memory_total FROM memory_history ORDER BY timestamp DESC LIMIT ?',
        (limit,)
    ).fetchall()
    data = rows_to_list(rows)
    data.reverse()

    result = []
    for row in data:
        t = time.localtime(row['timestamp'])
        result.append({
            'time': time.strftime('%H:%M:%S', t),
            'value': row['memory_percent']
        })
    return jsonify(result)


# ──────────────────────────────────────────────
# PROCESSES
# ──────────────────────────────────────────────

@api.route('/processes', methods=['GET'])
def get_processes_api():
    """Get current running processes."""
    processes = collector_manager.latest_processes
    if not processes:
        db = get_db()
        rows = db.execute(
            'SELECT * FROM process_snapshots ORDER BY cpu_percent DESC'
        ).fetchall()
        processes = [{
            'pid': r['pid'], 'name': r['name'], 'cpu': r['cpu_percent'],
            'memory': r['memory_percent'], 'status': r['status'],
            'user': r['user_name'], 'startTime': r['start_time'],
            'command': r['command']
        } for r in rows]
    return jsonify(processes)


@api.route('/processes/kill', methods=['POST'])
def kill_process_api():
    """Kill a process by PID."""
    data = request.get_json() or {}
    pid = data.get('pid')
    sig = data.get('signal', 15)  # Default SIGTERM

    if not pid:
        return jsonify({'success': False, 'message': 'PID required'}), 400

    success, message = kill_process(int(pid), int(sig))

    # Log action
    db = get_db()
    db.execute('''
        INSERT INTO process_actions (timestamp, pid, process_name, action, result)
        VALUES (?, ?, ?, ?, ?)
    ''', (time.time(), pid, data.get('name', ''), f'kill(signal={sig})', message))
    db.commit()

    return jsonify({'success': success, 'message': message})


@api.route('/processes/suspend', methods=['POST'])
def suspend_process_api():
    """Suspend a process (SIGSTOP)."""
    data = request.get_json() or {}
    pid = data.get('pid')
    if not pid:
        return jsonify({'success': False, 'message': 'PID required'}), 400

    success, message = kill_process(int(pid), signal.SIGSTOP)

    db = get_db()
    db.execute('''
        INSERT INTO process_actions (timestamp, pid, process_name, action, result)
        VALUES (?, ?, ?, ?, ?)
    ''', (time.time(), pid, data.get('name', ''), 'suspend', message))
    db.commit()

    return jsonify({'success': success, 'message': message})


@api.route('/processes/resume', methods=['POST'])
def resume_process_api():
    """Resume a suspended process (SIGCONT)."""
    data = request.get_json() or {}
    pid = data.get('pid')
    if not pid:
        return jsonify({'success': False, 'message': 'PID required'}), 400

    success, message = kill_process(int(pid), signal.SIGCONT)

    db = get_db()
    db.execute('''
        INSERT INTO process_actions (timestamp, pid, process_name, action, result)
        VALUES (?, ?, ?, ?, ?)
    ''', (time.time(), pid, data.get('name', ''), 'resume', message))
    db.commit()

    return jsonify({'success': success, 'message': message})


# ──────────────────────────────────────────────
# STORAGE / MONITORED PATHS
# ──────────────────────────────────────────────

@api.route('/storage/usage', methods=['GET'])
def storage_usage():
    """Get general disk usage for common paths."""
    paths_to_check = ['/', os.path.expanduser('~')]
    sdcard = '/sdcard'
    if os.path.exists(sdcard):
        paths_to_check.append(sdcard)

    result = []
    for p in paths_to_check:
        usage = get_disk_usage(p)
        result.append({
            'path': p,
            'total': usage['total'],
            'used': usage['used'],
            'free': usage['free'],
            'percent': usage['percent']
        })
    return jsonify(result)


@api.route('/storage/monitored', methods=['GET'])
def get_monitored_paths():
    """Get user-monitored paths."""
    db = get_db()
    paths = db.execute('SELECT * FROM monitored_paths ORDER BY created_at DESC').fetchall()
    result = []
    for p in paths:
        # Get latest usage
        latest = db.execute(
            'SELECT used_bytes, total_bytes, percent FROM storage_history WHERE path_id = ? ORDER BY timestamp DESC LIMIT 1',
            (p['id'],)
        ).fetchone()

        result.append({
            'id': str(p['id']),
            'path': p['path'],
            'threshold': p['threshold'],
            'usedBytes': latest['used_bytes'] if latest else 0,
            'totalBytes': latest['total_bytes'] if latest else 0,
            'createdAt': p['created_at'] * 1000  # JS uses milliseconds
        })
    return jsonify(result)


@api.route('/storage/monitored', methods=['POST'])
def add_monitored_path():
    """Add a path to monitor."""
    data = request.get_json() or {}
    path = data.get('path', '').strip()
    threshold = data.get('threshold', 80)

    if not path:
        return jsonify({'success': False, 'message': 'Path required'}), 400

    # Expand ~ and check
    path = os.path.expanduser(path)

    db = get_db()
    try:
        db.execute('INSERT INTO monitored_paths (path, threshold, created_at) VALUES (?, ?, ?)',
                   (path, threshold, time.time()))
        db.commit()
        return jsonify({'success': True, 'message': f'Now monitoring {path}'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@api.route('/storage/monitored/<int:path_id>', methods=['DELETE'])
def remove_monitored_path(path_id):
    """Remove a monitored path."""
    db = get_db()
    db.execute('DELETE FROM storage_history WHERE path_id = ?', (path_id,))
    db.execute('DELETE FROM monitored_paths WHERE id = ?', (path_id,))
    db.commit()
    return jsonify({'success': True})


@api.route('/storage/history/<int:path_id>', methods=['GET'])
def storage_path_history(path_id):
    """Get storage usage history for a specific monitored path."""
    db = get_db()
    limit = request.args.get('limit', 100, type=int)
    rows = db.execute(
        'SELECT timestamp, used_bytes, total_bytes, percent FROM storage_history WHERE path_id = ? ORDER BY timestamp DESC LIMIT ?',
        (path_id, limit)
    ).fetchall()
    data = rows_to_list(rows)
    data.reverse()

    result = []
    for row in data:
        t = time.localtime(row['timestamp'])
        result.append({
            'time': time.strftime('%m/%d %H:%M', t),
            'value': row['percent'],
            'used': row['used_bytes'],
            'total': row['total_bytes']
        })
    return jsonify(result)


# ──────────────────────────────────────────────
# NETWORK
# ──────────────────────────────────────────────

@api.route('/network/current', methods=['GET'])
def network_current():
    """Get current network stats."""
    interfaces = collector_manager.latest_interfaces
    total_down = sum(i.get('rxSpeed', 0) for i in interfaces)
    total_up = sum(i.get('txSpeed', 0) for i in interfaces)
    latency = collector_manager.latest_metrics.get('networkLatency', 0)

    return jsonify({
        'download': total_down,
        'upload': total_up,
        'latency': latency,
        'interfaces': interfaces
    })


@api.route('/network/history', methods=['GET'])
def network_history():
    """Get network speed history."""
    db = get_db()
    limit = request.args.get('limit', 60, type=int)
    interface = request.args.get('interface', None)

    if interface:
        rows = db.execute(
            'SELECT timestamp, speed_down, speed_up FROM network_history WHERE interface = ? ORDER BY timestamp DESC LIMIT ?',
            (interface, limit)
        ).fetchall()
    else:
        # Aggregate all interfaces per timestamp
        rows = db.execute('''
            SELECT timestamp, SUM(speed_down) as speed_down, SUM(speed_up) as speed_up 
            FROM network_history 
            GROUP BY CAST(timestamp AS INT) 
            ORDER BY timestamp DESC LIMIT ?
        ''', (limit,)).fetchall()

    data = rows_to_list(rows)
    data.reverse()

    result = []
    for row in data:
        t = time.localtime(row['timestamp'])
        result.append({
            'time': time.strftime('%H:%M:%S', t),
            'download': round(row['speed_down'], 1),
            'upload': round(row['speed_up'], 1)
        })
    return jsonify(result)


@api.route('/network/interfaces', methods=['GET'])
def network_interfaces():
    """Get network interface details."""
    return jsonify(collector_manager.latest_interfaces)


@api.route('/network/latency/history', methods=['GET'])
def latency_history():
    """Get latency history."""
    db = get_db()
    limit = request.args.get('limit', 60, type=int)
    rows = db.execute(
        'SELECT timestamp, latency_ms FROM latency_history ORDER BY timestamp DESC LIMIT ?',
        (limit,)
    ).fetchall()
    data = rows_to_list(rows)
    data.reverse()

    result = []
    for row in data:
        t = time.localtime(row['timestamp'])
        result.append({
            'time': time.strftime('%H:%M:%S', t),
            'value': row['latency_ms']
        })
    return jsonify(result)


# ──────────────────────────────────────────────
# PORTS
# ──────────────────────────────────────────────

@api.route('/ports/monitored', methods=['GET'])
def get_monitored_ports():
    """Get monitored ports with latest status."""
    db = get_db()
    ports = db.execute('SELECT * FROM monitored_ports ORDER BY created_at DESC').fetchall()

    result = []
    for p in ports:
        # Get latest status
        latest = db.execute(
            'SELECT status, response_time FROM port_history WHERE port_id = ? ORDER BY timestamp DESC LIMIT 1',
            (p['id'],)
        ).fetchone()

        # Calculate uptime percentage (last 24h)
        day_ago = time.time() - 86400
        total_checks = db.execute(
            'SELECT COUNT(*) as cnt FROM port_history WHERE port_id = ? AND timestamp > ?',
            (p['id'], day_ago)
        ).fetchone()
        open_checks = db.execute(
            'SELECT COUNT(*) as cnt FROM port_history WHERE port_id = ? AND timestamp > ? AND status = "open"',
            (p['id'], day_ago)
        ).fetchone()

        uptime_pct = 0
        if total_checks and total_checks['cnt'] > 0:
            uptime_pct = round((open_checks['cnt'] / total_checks['cnt']) * 100, 1)

        result.append({
            'id': str(p['id']),
            'port': p['port'],
            'protocol': p['protocol'],
            'description': p['description'],
            'active': bool(p['active']),
            'status': latest['status'] if latest else 'unknown',
            'uptime': uptime_pct
        })
    return jsonify(result)


@api.route('/ports/monitored', methods=['POST'])
def add_monitored_port():
    """Add a port to monitor."""
    data = request.get_json() or {}
    port = data.get('port')
    protocol = data.get('protocol', 'tcp')
    description = data.get('description', '')

    if not port:
        return jsonify({'success': False, 'message': 'Port required'}), 400

    db = get_db()
    db.execute('INSERT INTO monitored_ports (port, protocol, description, created_at) VALUES (?, ?, ?, ?)',
               (int(port), protocol, description, time.time()))
    db.commit()
    return jsonify({'success': True, 'message': f'Now monitoring port {port}/{protocol}'})


@api.route('/ports/monitored/<int:port_id>', methods=['DELETE'])
def remove_monitored_port(port_id):
    """Remove a monitored port."""
    db = get_db()
    db.execute('DELETE FROM port_history WHERE port_id = ?', (port_id,))
    db.execute('DELETE FROM monitored_ports WHERE id = ?', (port_id,))
    db.commit()
    return jsonify({'success': True})


@api.route('/ports/check', methods=['POST'])
def check_port_api():
    """Check a port immediately."""
    data = request.get_json() or {}
    port = data.get('port')
    protocol = data.get('protocol', 'tcp')

    if not port:
        return jsonify({'success': False, 'message': 'Port required'}), 400

    status, response_time = check_port(int(port), protocol)
    return jsonify({'status': status, 'responseTime': response_time})


# ──────────────────────────────────────────────
# ALERTS
# ──────────────────────────────────────────────

@api.route('/alerts', methods=['GET'])
def get_alerts():
    """Get alerts with optional filtering."""
    db = get_db()
    alert_type = request.args.get('type', None)
    severity = request.args.get('severity', None)
    acknowledged = request.args.get('acknowledged', None)
    limit = request.args.get('limit', 100, type=int)

    query = 'SELECT * FROM alerts WHERE 1=1'
    params = []

    if alert_type:
        query += ' AND type = ?'
        params.append(alert_type)
    if severity:
        query += ' AND severity = ?'
        params.append(severity)
    if acknowledged is not None:
        query += ' AND acknowledged = ?'
        params.append(1 if acknowledged == 'true' else 0)

    query += ' ORDER BY timestamp DESC LIMIT ?'
    params.append(limit)

    rows = db.execute(query, params).fetchall()

    result = []
    for r in rows:
        result.append({
            'id': str(r['id']),
            'timestamp': r['timestamp'] * 1000,  # JS milliseconds
            'type': r['type'],
            'severity': r['severity'],
            'message': r['message'],
            'details': r['details'],
            'acknowledged': bool(r['acknowledged']),
            'note': r['note'] or ''
        })
    return jsonify(result)


@api.route('/alerts/<int:alert_id>/acknowledge', methods=['POST'])
def acknowledge_alert(alert_id):
    """Acknowledge an alert."""
    db = get_db()
    data = request.get_json() or {}
    note = data.get('note', '')

    db.execute('UPDATE alerts SET acknowledged = 1, note = ? WHERE id = ?', (note, alert_id))
    db.commit()
    return jsonify({'success': True})


@api.route('/alerts/<int:alert_id>', methods=['DELETE'])
def delete_alert(alert_id):
    """Delete an alert."""
    db = get_db()
    db.execute('DELETE FROM alerts WHERE id = ?', (alert_id,))
    db.commit()
    return jsonify({'success': True})


@api.route('/alerts', methods=['POST'])
def create_alert():
    """Create a manual alert."""
    data = request.get_json() or {}
    db = get_db()
    db.execute('''
        INSERT INTO alerts (timestamp, type, severity, message, details)
        VALUES (?, ?, ?, ?, ?)
    ''', (time.time(), data.get('type', 'info'), data.get('severity', 'info'),
          data.get('message', ''), data.get('details', '')))
    db.commit()
    return jsonify({'success': True})


# ──────────────────────────────────────────────
# SCRIPTS
# ──────────────────────────────────────────────

@api.route('/scripts', methods=['GET'])
def get_scripts():
    """Get all registered scripts."""
    db = get_db()
    rows = db.execute('SELECT * FROM scripts ORDER BY created_at DESC').fetchall()

    result = []
    for r in rows:
        tags = []
        try:
            tags = json.loads(r['tags']) if r['tags'] else []
        except Exception:
            pass

        result.append({
            'id': str(r['id']),
            'name': r['name'],
            'path': r['path'],
            'description': r['description'],
            'tags': tags,
            'lastRunStatus': r['last_run_status'],
            'lastRunTime': r['last_run_time'] * 1000 if r['last_run_time'] else None
        })
    return jsonify(result)


@api.route('/scripts', methods=['POST'])
def add_script():
    """Register a new script."""
    data = request.get_json() or {}
    name = data.get('name', '')
    path = data.get('path', '')
    description = data.get('description', '')
    tags = data.get('tags', [])

    if not name or not path:
        return jsonify({'success': False, 'message': 'Name and path required'}), 400

    path = os.path.expanduser(path)

    db = get_db()
    db.execute('''
        INSERT INTO scripts (name, path, description, tags, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (name, path, description, json.dumps(tags), time.time()))
    db.commit()
    return jsonify({'success': True, 'message': f'Script "{name}" registered'})


@api.route('/scripts/<int:script_id>', methods=['DELETE'])
def delete_script(script_id):
    """Delete a registered script."""
    db = get_db()
    db.execute('DELETE FROM script_executions WHERE script_id = ?', (script_id,))
    db.execute('DELETE FROM scripts WHERE id = ?', (script_id,))
    db.commit()
    return jsonify({'success': True})


@api.route('/scripts/<int:script_id>/run', methods=['POST'])
def run_script_api(script_id):
    """Run a registered script."""
    db = get_db()
    script = db.execute('SELECT * FROM scripts WHERE id = ?', (script_id,)).fetchone()
    if not script:
        return jsonify({'success': False, 'message': 'Script not found'}), 404

    success, pid_or_error, proc = run_script(script['path'], str(script_id))

    if success:
        now = time.time()
        db.execute('UPDATE scripts SET last_run_status = "running", last_run_time = ? WHERE id = ?',
                   (now, script_id))
        db.execute('''
            INSERT INTO script_executions (script_id, pid, start_time, status)
            VALUES (?, ?, ?, 'running')
        ''', (script_id, pid_or_error, now))
        db.commit()

        # Start a background thread to wait for completion
        import threading
        def wait_for_script():
            try:
                stdout, stderr = proc.communicate(timeout=3600)
                end_time = time.time()
                exit_code = proc.returncode
                status = 'success' if exit_code == 0 else 'failure'

                sdb = get_db()
                sdb.execute('''
                    UPDATE script_executions SET end_time = ?, status = ?, 
                    output = ?, error = ?, exit_code = ?
                    WHERE script_id = ? AND pid = ? AND status = 'running'
                ''', (end_time, status,
                      stdout.decode(errors='replace')[:10000] if stdout else '',
                      stderr.decode(errors='replace')[:10000] if stderr else '',
                      exit_code, script_id, pid_or_error))
                sdb.execute('UPDATE scripts SET last_run_status = ? WHERE id = ?',
                           (status, script_id))
                sdb.commit()
            except Exception as e:
                print(f"[ScriptRunner] Error waiting for script {script_id}: {e}")

        t = threading.Thread(target=wait_for_script, daemon=True)
        t.start()

        return jsonify({'success': True, 'message': f'Script started (PID: {pid_or_error})', 'pid': pid_or_error})
    else:
        db.execute('UPDATE scripts SET last_run_status = "failure" WHERE id = ?', (script_id,))
        db.commit()
        return jsonify({'success': False, 'message': str(pid_or_error)}), 500


@api.route('/scripts/<int:script_id>/stop', methods=['POST'])
def stop_script_api(script_id):
    """Stop a running script."""
    success = stop_script(str(script_id))
    if success:
        db = get_db()
        db.execute('UPDATE scripts SET last_run_status = "failure" WHERE id = ?', (script_id,))
        db.execute('''
            UPDATE script_executions SET end_time = ?, status = 'killed'
            WHERE script_id = ? AND status = 'running'
        ''', (time.time(), script_id))
        db.commit()
        return jsonify({'success': True, 'message': 'Script stopped'})
    return jsonify({'success': False, 'message': 'Script not found or not running'}), 404


@api.route('/scripts/<int:script_id>/executions', methods=['GET'])
def script_executions(script_id):
    """Get execution history for a script."""
    db = get_db()
    rows = db.execute(
        'SELECT * FROM script_executions WHERE script_id = ? ORDER BY start_time DESC LIMIT 50',
        (script_id,)
    ).fetchall()
    return jsonify(rows_to_list(rows))


# ──────────────────────────────────────────────
# CRON JOBS
# ──────────────────────────────────────────────

@api.route('/cron/jobs', methods=['GET'])
def get_cron_jobs():
    """Get cron jobs (from DB + system crontab)."""
    db = get_db()

    # Get jobs from our DB
    db_jobs = db.execute('SELECT * FROM cron_jobs ORDER BY created_at DESC').fetchall()

    # Also try to read system crontab
    system_jobs = get_crontab()

    result = []
    for j in db_jobs:
        result.append({
            'id': str(j['id']),
            'schedule': j['schedule'],
            'command': j['command'],
            'description': j['description'],
            'active': bool(j['active']),
            'lastRun': j['last_run'] * 1000 if j['last_run'] else None,
            'nextRun': j['next_run'] * 1000 if j['next_run'] else None,
            'source': 'dashboard'
        })

    # Add system cron jobs (read-only)
    for j in system_jobs:
        result.append({
            'id': f'sys_{hash(j["command"])}',
            'schedule': j['schedule'],
            'command': j['command'],
            'description': 'System crontab',
            'active': True,
            'lastRun': None,
            'nextRun': None,
            'source': 'system'
        })

    return jsonify(result)


@api.route('/cron/jobs', methods=['POST'])
def add_cron_job():
    """Add a new cron job."""
    data = request.get_json() or {}
    schedule = data.get('schedule', '')
    command = data.get('command', '')
    description = data.get('description', '')

    if not schedule or not command:
        return jsonify({'success': False, 'message': 'Schedule and command required'}), 400

    db = get_db()
    db.execute('''
        INSERT INTO cron_jobs (schedule, command, description, created_at)
        VALUES (?, ?, ?, ?)
    ''', (schedule, command, description, time.time()))
    db.commit()
    return jsonify({'success': True, 'message': 'Cron job added'})


@api.route('/cron/jobs/<int:job_id>', methods=['DELETE'])
def delete_cron_job(job_id):
    """Delete a cron job."""
    db = get_db()
    db.execute('DELETE FROM cron_jobs WHERE id = ?', (job_id,))
    db.commit()
    return jsonify({'success': True})


@api.route('/cron/jobs/<int:job_id>/toggle', methods=['PUT'])
def toggle_cron_job(job_id):
    """Toggle a cron job active/inactive."""
    db = get_db()
    job = db.execute('SELECT active FROM cron_jobs WHERE id = ?', (job_id,)).fetchone()
    if job:
        new_active = 0 if job['active'] else 1
        db.execute('UPDATE cron_jobs SET active = ? WHERE id = ?', (new_active, job_id))
        db.commit()
        return jsonify({'success': True, 'active': bool(new_active)})
    return jsonify({'success': False, 'message': 'Job not found'}), 404


# ──────────────────────────────────────────────
# FILE MONITORING
# ──────────────────────────────────────────────

@api.route('/files/monitored', methods=['GET'])
def get_monitored_files():
    """Get monitored files."""
    db = get_db()
    rows = db.execute('SELECT * FROM monitored_files ORDER BY created_at DESC').fetchall()

    result = []
    for r in rows:
        result.append({
            'id': str(r['id']),
            'path': r['path'],
            'description': r['description'],
            'active': bool(r['active']),
            'lastModified': r['last_modified'] * 1000 if r['last_modified'] else None,
            'size': r['last_size']
        })
    return jsonify(result)


@api.route('/files/monitored', methods=['POST'])
def add_monitored_file():
    """Add a file to monitor."""
    data = request.get_json() or {}
    path = data.get('path', '').strip()
    description = data.get('description', '')

    if not path:
        return jsonify({'success': False, 'message': 'Path required'}), 400

    path = os.path.expanduser(path)

    db = get_db()
    try:
        db.execute('''
            INSERT INTO monitored_files (path, description, created_at)
            VALUES (?, ?, ?)
        ''', (path, description, time.time()))
        db.commit()
        return jsonify({'success': True, 'message': f'Now monitoring {path}'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@api.route('/files/monitored/<int:file_id>', methods=['DELETE'])
def remove_monitored_file(file_id):
    """Remove a monitored file."""
    db = get_db()
    db.execute('DELETE FROM file_events WHERE file_id = ?', (file_id,))
    db.execute('DELETE FROM monitored_files WHERE id = ?', (file_id,))
    db.commit()
    return jsonify({'success': True})


@api.route('/files/<int:file_id>/content', methods=['GET'])
def get_file_content(file_id):
    """Get content of a monitored file."""
    db = get_db()
    f = db.execute('SELECT path FROM monitored_files WHERE id = ?', (file_id,)).fetchone()
    if not f:
        return jsonify({'error': 'File not found'}), 404

    lines = request.args.get('lines', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    content = read_file_content(f['path'], lines=lines, offset=offset)
    return jsonify({
        'path': f['path'],
        'content': content,
        'lineCount': len(content)
    })


@api.route('/files/<int:file_id>/events', methods=['GET'])
def get_file_events(file_id):
    """Get events for a monitored file."""
    db = get_db()
    limit = request.args.get('limit', 50, type=int)
    rows = db.execute(
        'SELECT * FROM file_events WHERE file_id = ? ORDER BY timestamp DESC LIMIT ?',
        (file_id, limit)
    ).fetchall()

    result = []
    for r in rows:
        # Get file path
        f = db.execute('SELECT path FROM monitored_files WHERE id = ?', (r['file_id'],)).fetchone()
        result.append({
            'id': str(r['id']),
            'timestamp': r['timestamp'] * 1000,
            'path': f['path'] if f else '',
            'eventType': r['event_type'],
            'snippet': r['content_snippet']
        })
    return jsonify(result)


@api.route('/files/events', methods=['GET'])
def get_all_file_events():
    """Get all file events across all monitored files."""
    db = get_db()
    limit = request.args.get('limit', 100, type=int)
    rows = db.execute('''
        SELECT fe.*, mf.path FROM file_events fe
        JOIN monitored_files mf ON fe.file_id = mf.id
        ORDER BY fe.timestamp DESC LIMIT ?
    ''', (limit,)).fetchall()

    result = []
    for r in rows:
        result.append({
            'id': str(r['id']),
            'timestamp': r['timestamp'] * 1000,
            'path': r['path'],
            'eventType': r['event_type'],
            'snippet': r['content_snippet']
        })
    return jsonify(result)


# ──────────────────────────────────────────────
# SETTINGS
# ──────────────────────────────────────────────

@api.route('/settings', methods=['GET'])
def get_settings():
    """Get current settings."""
    cfg = load_config()
    return jsonify({
        'refreshInterval': cfg.get('refresh_interval', 5),
        'cpuThreshold': cfg.get('cpu_threshold', 85),
        'memoryThreshold': cfg.get('memory_threshold', 80),
        'storageThreshold': cfg.get('storage_threshold', 90),
        'retentionDays': cfg.get('data_retention_days', 30),
        'loginEnabled': cfg.get('login', 'on') == 'on',
        'notificationsEnabled': True,
        'toastNotifications': True,
        'termuxNotifications': False
    })


@api.route('/settings', methods=['POST'])
def update_settings():
    """Update settings."""
    data = request.get_json() or {}

    cfg_update = {}
    if 'refreshInterval' in data:
        cfg_update['refresh_interval'] = data['refreshInterval']
        collector_manager.refresh_interval = data['refreshInterval']
    if 'cpuThreshold' in data:
        cfg_update['cpu_threshold'] = data['cpuThreshold']
    if 'memoryThreshold' in data:
        cfg_update['memory_threshold'] = data['memoryThreshold']
    if 'storageThreshold' in data:
        cfg_update['storage_threshold'] = data['storageThreshold']
    if 'retentionDays' in data:
        cfg_update['data_retention_days'] = data['retentionDays']
    if 'loginEnabled' in data:
        cfg_update['login'] = 'on' if data['loginEnabled'] else 'off'

    if cfg_update:
        save_config(cfg_update)
        # Reload config
        config.update(load_config())

    return jsonify({'success': True, 'message': 'Settings updated'})


# ──────────────────────────────────────────────
# DATA EXPORT & CLEANUP
# ──────────────────────────────────────────────

@api.route('/data/export', methods=['GET'])
def export_data_api():
    """Export data from a table."""
    table = request.args.get('table', 'system_metrics')
    fmt = request.args.get('format', 'json')

    allowed_tables = [
        'system_metrics', 'cpu_history', 'memory_history',
        'network_history', 'alerts', 'storage_history',
        'port_history', 'file_events', 'script_executions'
    ]

    if table not in allowed_tables:
        return jsonify({'error': f'Table not allowed. Choose from: {allowed_tables}'}), 400

    db = get_db()
    data = export_data(db, table, fmt)

    if fmt == 'csv':
        from flask import Response
        return Response(data, mimetype='text/csv',
                       headers={'Content-Disposition': f'attachment; filename={table}.csv'})
    return jsonify(json.loads(data) if isinstance(data, str) else data)


@api.route('/data/cleanup', methods=['POST'])
def cleanup_data():
    """Manually trigger data cleanup."""
    data = request.get_json() or {}
    days = data.get('retentionDays', 30)
    cleanup_old_data(days)
    return jsonify({'success': True, 'message': f'Cleaned data older than {days} days'})


# ──────────────────────────────────────────────
# SYSTEM INFO (for Help page)
# ──────────────────────────────────────────────

@api.route('/system/info', methods=['GET'])
def system_info():
    """Get system information for diagnostics."""
    import platform
    info = {
        'platform': platform.platform(),
        'python': platform.python_version(),
        'architecture': platform.machine(),
        'hostname': platform.node(),
        'dbPath': os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'termux_monitor.db')),
        'configPath': os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config.json')),
    }

    # Check available tools
    tools = {}
    for tool in ['termux-battery-status', 'nmap', 'crontab', 'ping', 'nc', 'ps', 'top']:
        try:
            import shutil as sh
            tools[tool] = sh.which(tool) is not None
        except Exception:
            tools[tool] = False
    info['tools'] = tools

    return jsonify(info)
