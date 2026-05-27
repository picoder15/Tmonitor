"""
System utility functions for Termux Performance Tracker.
Reads real data from /proc filesystem, Termux APIs, and system commands.
Handles graceful fallbacks when features are unavailable.
"""

import os
import re
import time
import json
import socket
import struct
import subprocess
import shutil

# ──────────────────────────────────────────────
# CPU
# ──────────────────────────────────────────────

_prev_cpu_times = None
_prev_cpu_timestamp = None


def _read_proc_stat():
    """Read /proc/stat and return total and idle CPU times."""
    try:
        with open('/proc/stat', 'r') as f:
            line = f.readline()
        parts = line.split()
        # user, nice, system, idle, iowait, irq, softirq, steal
        times = [int(x) for x in parts[1:8]]
        idle = times[3] + times[4]  # idle + iowait
        total = sum(times)
        return total, idle
    except Exception:
        return None, None


def get_cpu_usage():
    """
    Calculate CPU usage percentage using /proc/stat delta method.
    Returns a float 0-100.
    """
    global _prev_cpu_times, _prev_cpu_timestamp

    total, idle = _read_proc_stat()
    if total is None:
        # Fallback: try top command
        return _get_cpu_from_top()

    now = time.time()

    if _prev_cpu_times is None:
        _prev_cpu_times = (total, idle)
        _prev_cpu_timestamp = now
        time.sleep(0.5)
        total2, idle2 = _read_proc_stat()
        if total2 is None:
            return 0.0
        dtotal = total2 - total
        didle = idle2 - idle
        if dtotal == 0:
            return 0.0
        cpu_percent = ((dtotal - didle) / dtotal) * 100
        _prev_cpu_times = (total2, idle2)
        _prev_cpu_timestamp = now
        return round(max(0, min(100, cpu_percent)), 1)

    dtotal = total - _prev_cpu_times[0]
    didle = idle - _prev_cpu_times[1]
    _prev_cpu_times = (total, idle)
    _prev_cpu_timestamp = now

    if dtotal == 0:
        return 0.0
    cpu_percent = ((dtotal - didle) / dtotal) * 100
    return round(max(0, min(100, cpu_percent)), 1)


def _get_cpu_from_top():
    """Fallback CPU usage from top command."""
    try:
        result = subprocess.run(
            ['top', '-bn1', '-n1'],
            capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.split('\n'):
            if 'cpu' in line.lower():
                match = re.search(r'(\d+\.?\d*)%?\s*idle', line, re.IGNORECASE)
                if match:
                    return round(100 - float(match.group(1)), 1)
        return 0.0
    except Exception:
        return 0.0


def get_per_cpu_usage():
    """Get per-CPU core usage (if multi-core info available)."""
    try:
        cores = []
        with open('/proc/stat', 'r') as f:
            for line in f:
                if line.startswith('cpu') and not line.startswith('cpu '):
                    parts = line.split()
                    times = [int(x) for x in parts[1:8]]
                    idle = times[3] + times[4]
                    total = sum(times)
                    cores.append({'total': total, 'idle': idle})
        return cores
    except Exception:
        return []


# ──────────────────────────────────────────────
# MEMORY
# ──────────────────────────────────────────────

def get_memory_info():
    """
    Read memory info from /proc/meminfo.
    Returns dict with total, used, available, percent, swap_total, swap_used, swap_percent.
    All sizes in bytes.
    """
    info = {
        'total': 0, 'used': 0, 'available': 0, 'percent': 0.0,
        'swap_total': 0, 'swap_used': 0, 'swap_free': 0, 'swap_percent': 0.0,
        'buffers': 0, 'cached': 0
    }
    try:
        meminfo = {}
        with open('/proc/meminfo', 'r') as f:
            for line in f:
                parts = line.split()
                key = parts[0].rstrip(':')
                value = int(parts[1]) * 1024  # Convert kB to bytes
                meminfo[key] = value

        info['total'] = meminfo.get('MemTotal', 0)
        info['available'] = meminfo.get('MemAvailable', meminfo.get('MemFree', 0))
        info['buffers'] = meminfo.get('Buffers', 0)
        info['cached'] = meminfo.get('Cached', 0)
        info['used'] = info['total'] - info['available']
        if info['total'] > 0:
            info['percent'] = round((info['used'] / info['total']) * 100, 1)

        info['swap_total'] = meminfo.get('SwapTotal', 0)
        info['swap_free'] = meminfo.get('SwapFree', 0)
        info['swap_used'] = info['swap_total'] - info['swap_free']
        if info['swap_total'] > 0:
            info['swap_percent'] = round((info['swap_used'] / info['swap_total']) * 100, 1)

    except Exception as e:
        print(f"[Utils] Error reading /proc/meminfo: {e}")

    return info


# ──────────────────────────────────────────────
# UPTIME
# ──────────────────────────────────────────────

def get_uptime():
    """
    Get system uptime in seconds from /proc/uptime.
    Returns float seconds.
    """
    try:
        with open('/proc/uptime', 'r') as f:
            line = f.readline()
        uptime_sec = float(line.split()[0])
        return round(uptime_sec, 1)
    except Exception:
        pass

    # Fallback: uptime command
    try:
        result = subprocess.run(['uptime', '-s'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            # Parse boot time and calculate difference
            from datetime import datetime
            boot_time = datetime.strptime(result.stdout.strip(), '%Y-%m-%d %H:%M:%S')
            return round((datetime.now() - boot_time).total_seconds(), 1)
    except Exception:
        pass

    return 0.0


def format_uptime(seconds):
    """Format uptime seconds into human-readable string."""
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)

    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    parts.append(f"{secs}s")
    return ' '.join(parts)


# ──────────────────────────────────────────────
# LOAD AVERAGE
# ──────────────────────────────────────────────

def get_load_average():
    """Get system load averages (1, 5, 15 minutes)."""
    try:
        with open('/proc/loadavg', 'r') as f:
            parts = f.readline().split()
        return [float(parts[0]), float(parts[1]), float(parts[2])]
    except Exception:
        try:
            loads = os.getloadavg()
            return [round(l, 2) for l in loads]
        except Exception:
            return [0.0, 0.0, 0.0]


# ──────────────────────────────────────────────
# TEMPERATURE
# ──────────────────────────────────────────────

def get_cpu_temperature():
    """
    Read CPU temperature from thermal zones.
    Returns temperature in Celsius.
    """
    thermal_paths = [
        '/sys/class/thermal/thermal_zone0/temp',
        '/sys/class/thermal/thermal_zone1/temp',
        '/sys/devices/virtual/thermal/thermal_zone0/temp',
    ]

    for path in thermal_paths:
        try:
            with open(path, 'r') as f:
                temp = int(f.readline().strip())
            # Usually in millidegrees Celsius
            if temp > 1000:
                temp = temp / 1000.0
            return round(temp, 1)
        except Exception:
            continue

    # Fallback: try all thermal zones and pick max
    try:
        temps = []
        zone_dir = '/sys/class/thermal/'
        if os.path.exists(zone_dir):
            for zone in os.listdir(zone_dir):
                temp_file = os.path.join(zone_dir, zone, 'temp')
                if os.path.exists(temp_file):
                    try:
                        with open(temp_file, 'r') as f:
                            t = int(f.readline().strip())
                        if t > 1000:
                            t = t / 1000.0
                        temps.append(t)
                    except Exception:
                        continue
        if temps:
            return round(max(temps), 1)
    except Exception:
        pass

    return 0.0


# ──────────────────────────────────────────────
# BATTERY (Termux:API)
# ──────────────────────────────────────────────

def get_battery_status():
    """
    Get battery status using termux-battery-status command.
    Requires Termux:API app installed.
    Returns dict with 'level' and 'charging'.
    """
    try:
        result = subprocess.run(
            ['termux-battery-status'],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            return {
                'level': data.get('percentage', -1),
                'charging': data.get('status', 'UNKNOWN') == 'CHARGING',
                'health': data.get('health', 'UNKNOWN'),
                'temperature': data.get('temperature', 0)
            }
    except FileNotFoundError:
        pass  # termux-battery-status not available
    except Exception as e:
        print(f"[Utils] Battery status error: {e}")

    # Fallback: read from sysfs
    try:
        level = -1
        charging = False
        cap_path = '/sys/class/power_supply/battery/capacity'
        status_path = '/sys/class/power_supply/battery/status'
        if os.path.exists(cap_path):
            with open(cap_path, 'r') as f:
                level = int(f.readline().strip())
        if os.path.exists(status_path):
            with open(status_path, 'r') as f:
                charging = f.readline().strip().upper() == 'CHARGING'
        return {'level': level, 'charging': charging, 'health': 'UNKNOWN', 'temperature': 0}
    except Exception:
        pass

    return {'level': -1, 'charging': False, 'health': 'UNKNOWN', 'temperature': 0}


# ──────────────────────────────────────────────
# PROCESSES
# ──────────────────────────────────────────────

def get_processes():
    """
    Get list of running processes with CPU and memory usage.
    Uses ps command which is available in Termux.
    Returns list of dicts.
    """
    processes = []
    try:
        # ps command format for Termux/Android
        result = subprocess.run(
            ['ps', '-eo', 'pid,user,%cpu,%mem,stat,etime,comm,args'],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            # Try simpler ps format
            result = subprocess.run(
                ['ps', '-e', '-o', 'pid,user,%cpu,%mem,stat,etime,comm'],
                capture_output=True, text=True, timeout=10
            )

        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            for line in lines[1:]:  # Skip header
                parts = line.split(None, 7)
                if len(parts) >= 6:
                    try:
                        pid = int(parts[0])
                        user = parts[1]
                        cpu = float(parts[2]) if len(parts) > 2 else 0.0
                        mem = float(parts[3]) if len(parts) > 3 else 0.0
                        stat = parts[4] if len(parts) > 4 else 'S'
                        etime = parts[5] if len(parts) > 5 else '00:00'
                        name = parts[6] if len(parts) > 6 else ''
                        cmd = parts[7] if len(parts) > 7 else name

                        status = 'running'
                        if 'T' in stat:
                            status = 'stopped'
                        elif 'Z' in stat:
                            status = 'zombie'
                        elif 'S' in stat or 'D' in stat:
                            status = 'sleeping'
                        elif 'R' in stat:
                            status = 'running'

                        processes.append({
                            'pid': pid,
                            'name': name,
                            'cpu': cpu,
                            'memory': mem,
                            'status': status,
                            'user': user,
                            'startTime': etime,
                            'command': cmd[:200]  # Limit command length
                        })
                    except (ValueError, IndexError):
                        continue
    except Exception as e:
        print(f"[Utils] Error getting processes: {e}")

    # Fallback: read /proc directly
    if not processes:
        processes = _get_processes_from_proc()

    return processes


def _get_processes_from_proc():
    """Fallback: Read process info directly from /proc filesystem."""
    processes = []
    try:
        for pid_str in os.listdir('/proc'):
            if not pid_str.isdigit():
                continue
            pid = int(pid_str)
            try:
                # Read comm
                with open(f'/proc/{pid}/comm', 'r') as f:
                    name = f.readline().strip()

                # Read status
                status = 'running'
                with open(f'/proc/{pid}/status', 'r') as f:
                    for line in f:
                        if line.startswith('State:'):
                            state_char = line.split()[1]
                            if state_char == 'T':
                                status = 'stopped'
                            elif state_char == 'Z':
                                status = 'zombie'
                            elif state_char in ('S', 'D'):
                                status = 'sleeping'
                            break

                # Read cmdline
                with open(f'/proc/{pid}/cmdline', 'r') as f:
                    cmd = f.readline().replace('\x00', ' ').strip()

                processes.append({
                    'pid': pid,
                    'name': name,
                    'cpu': 0.0,
                    'memory': 0.0,
                    'status': status,
                    'user': '',
                    'startTime': '',
                    'command': cmd[:200] if cmd else name
                })
            except (PermissionError, FileNotFoundError):
                continue
    except Exception as e:
        print(f"[Utils] Error reading /proc for processes: {e}")

    return processes


def get_process_count():
    """Get total number of running processes."""
    try:
        count = 0
        for entry in os.listdir('/proc'):
            if entry.isdigit():
                count += 1
        return count
    except Exception:
        return 0


def kill_process(pid, signal_num=15):
    """
    Send signal to a process.
    signal_num: 15 = SIGTERM, 9 = SIGKILL, 19 = SIGSTOP, 18 = SIGCONT
    """
    try:
        os.kill(pid, signal_num)
        return True, f"Signal {signal_num} sent to PID {pid}"
    except ProcessLookupError:
        return False, f"Process {pid} not found"
    except PermissionError:
        return False, f"Permission denied for PID {pid}"
    except Exception as e:
        return False, str(e)


# ──────────────────────────────────────────────
# DISK / STORAGE
# ──────────────────────────────────────────────

def get_disk_usage(path='/'):
    """
    Get disk usage for a given path.
    Returns dict with total, used, free, percent (all in bytes except percent).
    """
    try:
        usage = shutil.disk_usage(path)
        percent = round((usage.used / usage.total) * 100, 1) if usage.total > 0 else 0
        return {
            'total': usage.total,
            'used': usage.used,
            'free': usage.free,
            'percent': percent
        }
    except Exception as e:
        print(f"[Utils] Error getting disk usage for {path}: {e}")
        return {'total': 0, 'used': 0, 'free': 0, 'percent': 0}


def get_directory_size(path):
    """
    Get the size of a directory or file in bytes.
    Uses du command for efficiency, falls back to os.walk.
    """
    if not os.path.exists(path):
        return -1

    if os.path.isfile(path):
        try:
            return os.path.getsize(path)
        except Exception:
            return -1

    try:
        result = subprocess.run(
            ['du', '-sb', path],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return int(result.stdout.split()[0])
    except Exception:
        pass

    # Fallback: walk directory
    total = 0
    try:
        for dirpath, dirnames, filenames in os.walk(path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                try:
                    total += os.path.getsize(fp)
                except (OSError, PermissionError):
                    continue
    except Exception:
        pass
    return total


# ──────────────────────────────────────────────
# NETWORK
# ──────────────────────────────────────────────

_prev_net_stats = {}
_prev_net_timestamp = None


def get_network_interfaces():
    """
    Read network interface statistics from /proc/net/dev.
    Returns list of dicts with interface name, bytes received/sent.
    """
    interfaces = []
    try:
        with open('/proc/net/dev', 'r') as f:
            lines = f.readlines()

        for line in lines[2:]:  # Skip header lines
            parts = line.split()
            if len(parts) >= 10:
                iface = parts[0].rstrip(':')
                rx_bytes = int(parts[1])
                tx_bytes = int(parts[9])
                interfaces.append({
                    'name': iface,
                    'rxBytes': rx_bytes,
                    'txBytes': tx_bytes,
                    'rxSpeed': 0.0,
                    'txSpeed': 0.0
                })
    except Exception as e:
        print(f"[Utils] Error reading /proc/net/dev: {e}")

    return interfaces


def get_network_speeds():
    """
    Calculate network speeds by comparing /proc/net/dev readings.
    Returns dict of interface -> {rxSpeed, txSpeed} in bytes/sec.
    """
    global _prev_net_stats, _prev_net_timestamp

    interfaces = get_network_interfaces()
    now = time.time()
    speeds = {}

    if _prev_net_timestamp is not None:
        dt = now - _prev_net_timestamp
        if dt > 0:
            for iface in interfaces:
                name = iface['name']
                if name in _prev_net_stats:
                    prev = _prev_net_stats[name]
                    rx_speed = max(0, (iface['rxBytes'] - prev['rxBytes']) / dt)
                    tx_speed = max(0, (iface['txBytes'] - prev['txBytes']) / dt)
                    iface['rxSpeed'] = round(rx_speed, 1)
                    iface['txSpeed'] = round(tx_speed, 1)
                    speeds[name] = {
                        'rxSpeed': round(rx_speed, 1),
                        'txSpeed': round(tx_speed, 1)
                    }

    # Store current stats for next calculation
    _prev_net_stats = {i['name']: i for i in interfaces}
    _prev_net_timestamp = now

    return interfaces, speeds


def get_network_latency(host='8.8.8.8', timeout=3):
    """
    Measure network latency by pinging a host.
    Returns latency in ms or -1 if unreachable.
    """
    try:
        result = subprocess.run(
            ['ping', '-c', '1', '-W', str(timeout), host],
            capture_output=True, text=True, timeout=timeout + 2
        )
        if result.returncode == 0:
            match = re.search(r'time[=<](\d+\.?\d*)', result.stdout)
            if match:
                return round(float(match.group(1)), 1)
    except Exception:
        pass

    # Fallback: TCP connect timing
    try:
        start = time.time()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((host, 53))
        sock.close()
        return round((time.time() - start) * 1000, 1)
    except Exception:
        return -1


# ──────────────────────────────────────────────
# PORT CHECKING
# ──────────────────────────────────────────────

def check_port(port, protocol='tcp', host='127.0.0.1', timeout=2):
    """
    Check if a port is open/listening.
    Returns (status, response_time_ms).
    """
    start = time.time()
    try:
        if protocol == 'tcp':
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        else:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        elapsed = round((time.time() - start) * 1000, 1)
        sock.close()

        if result == 0:
            return 'open', elapsed
        else:
            return 'closed', elapsed
    except socket.timeout:
        return 'closed', round((time.time() - start) * 1000, 1)
    except Exception:
        return 'unknown', 0


# ──────────────────────────────────────────────
# CRON JOBS
# ──────────────────────────────────────────────

def get_crontab():
    """
    Read current user's crontab.
    Returns list of dicts with schedule and command.
    """
    jobs = []
    try:
        result = subprocess.run(
            ['crontab', '-l'],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            for line in result.stdout.strip().split('\n'):
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                parts = line.split(None, 5)
                if len(parts) >= 6:
                    schedule = ' '.join(parts[:5])
                    command = parts[5]
                    jobs.append({
                        'schedule': schedule,
                        'command': command
                    })
    except FileNotFoundError:
        pass  # crontab not available
    except Exception as e:
        print(f"[Utils] Error reading crontab: {e}")

    return jobs


def set_crontab(lines):
    """
    Write crontab entries.
    lines: list of strings, each a full crontab line.
    """
    try:
        content = '\n'.join(lines) + '\n'
        proc = subprocess.Popen(
            ['crontab', '-'],
            stdin=subprocess.PIPE,
            capture_output=True, text=True, timeout=5
        )
        stdout, stderr = proc.communicate(input=content)
        return proc.returncode == 0, stderr
    except Exception as e:
        return False, str(e)


# ──────────────────────────────────────────────
# FILE MONITORING
# ──────────────────────────────────────────────

def get_file_info(path):
    """Get file modification time and size."""
    try:
        stat = os.stat(path)
        return {
            'exists': True,
            'size': stat.st_size,
            'modified': stat.st_mtime,
            'is_file': os.path.isfile(path),
            'is_dir': os.path.isdir(path)
        }
    except Exception:
        return {'exists': False, 'size': 0, 'modified': 0, 'is_file': False, 'is_dir': False}


def read_file_content(path, lines=100, offset=0):
    """
    Read the last N lines of a file, or all lines.
    Returns list of strings.
    """
    try:
        if not os.path.isfile(path):
            return []

        with open(path, 'r', errors='replace') as f:
            if lines <= 0:
                # Read all
                return f.readlines()
            else:
                # Read last N lines (tail)
                all_lines = f.readlines()
                if offset > 0:
                    return all_lines[offset:offset + lines]
                return all_lines[-lines:]
    except Exception as e:
        print(f"[Utils] Error reading file {path}: {e}")
        return [f"Error reading file: {e}"]


# ──────────────────────────────────────────────
# SCRIPT EXECUTION
# ──────────────────────────────────────────────

_running_scripts = {}  # script_id -> subprocess.Popen


def run_script(script_path, script_id):
    """
    Run a script in the background.
    Returns (success, pid_or_error).
    """
    if not os.path.exists(script_path):
        return False, f"Script not found: {script_path}", None

    try:
        # Determine interpreter
        ext = os.path.splitext(script_path)[1].lower()
        if ext == '.py':
            cmd = ['python', script_path]
        elif ext in ('.sh', '.bash'):
            cmd = ['bash', script_path]
        elif ext == '.js':
            cmd = ['node', script_path]
        else:
            # Try to execute directly
            os.chmod(script_path, 0o755)
            cmd = [script_path]

        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=os.setpgrp if hasattr(os, 'setpgrp') else None
        )
        _running_scripts[script_id] = proc
        return True, proc.pid, proc
    except Exception as e:
        return False, str(e), None


def stop_script(script_id):
    """Stop a running script."""
    if script_id in _running_scripts:
        proc = _running_scripts[script_id]
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        except Exception:
            pass
        del _running_scripts[script_id]
        return True
    return False


def get_script_output(script_id):
    """Get output from a running/completed script."""
    if script_id in _running_scripts:
        proc = _running_scripts[script_id]
        if proc.poll() is not None:
            stdout, stderr = proc.communicate()
            del _running_scripts[script_id]
            return {
                'running': False,
                'exit_code': proc.returncode,
                'stdout': stdout.decode(errors='replace') if stdout else '',
                'stderr': stderr.decode(errors='replace') if stderr else ''
            }
        return {'running': True, 'exit_code': -1, 'stdout': '', 'stderr': ''}
    return None


# ──────────────────────────────────────────────
# TERMUX NOTIFICATION
# ──────────────────────────────────────────────

def send_termux_notification(title, message, notification_id='termux-monitor'):
    """Send a notification via Termux:API."""
    try:
        subprocess.run(
            ['termux-notification',
             '--title', title,
             '--content', message,
             '--id', notification_id],
            capture_output=True, timeout=5
        )
        return True
    except Exception:
        return False


# ──────────────────────────────────────────────
# DATA EXPORT
# ──────────────────────────────────────────────

def export_data(db, table, format='json'):
    """Export data from a database table."""
    try:
        cursor = db.execute(f'SELECT * FROM {table} ORDER BY timestamp DESC LIMIT 10000')
        rows = cursor.fetchall()
        data = [dict(row) for row in rows]

        if format == 'json':
            return json.dumps(data, indent=2)
        elif format == 'csv':
            if not data:
                return ''
            import csv
            import io
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
            return output.getvalue()
    except Exception as e:
        return json.dumps({'error': str(e)})
