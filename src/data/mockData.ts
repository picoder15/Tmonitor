import type { Alert, MonitoredPath, MonitoredPort, ProcessInfo, CronJob, ScriptEntry, MonitoredFile, FileEvent, SystemMetrics, MetricPoint, NetworkInterface } from '../types';

const now = Date.now();
const hour = 3600000;
const minute = 60000;

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max)); }

export function generateTimeSeriesData(points: number, minVal: number, maxVal: number, interval: number = 5000): MetricPoint[] {
  const data: MetricPoint[] = [];
  let base = minVal + (maxVal - minVal) * 0.4;
  for (let i = 0; i < points; i++) {
    base += rand(-3, 3);
    base = Math.max(minVal, Math.min(maxVal, base));
    const t = new Date(now - (points - i) * interval);
    data.push({
      time: t.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: Math.round(base * 10) / 10
    });
  }
  return data;
}

export function generateDualTimeSeries(points: number): { time: string; cpu: number; processes: number }[] {
  const data: { time: string; cpu: number; processes: number }[] = [];
  let cpuBase = 35;
  let procBase = 45;
  for (let i = 0; i < points; i++) {
    cpuBase += rand(-5, 5);
    cpuBase = Math.max(5, Math.min(95, cpuBase));
    procBase = 30 + cpuBase * 0.5 + rand(-5, 5);
    procBase = Math.max(20, Math.min(120, procBase));
    const t = new Date(now - (points - i) * 5000);
    data.push({
      time: t.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cpu: Math.round(cpuBase * 10) / 10,
      processes: Math.round(procBase)
    });
  }
  return data;
}

export function generateNetworkSpeedData(points: number): { time: string; download: number; upload: number }[] {
  const data: { time: string; download: number; upload: number }[] = [];
  for (let i = 0; i < points; i++) {
    const t = new Date(now - (points - i) * 2000);
    data.push({
      time: t.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      download: Math.round(rand(100, 5000)),
      upload: Math.round(rand(50, 2000))
    });
  }
  return data;
}

export function generateStorageHistory(points: number): { time: string; used: number }[] {
  const data: { time: string; used: number }[] = [];
  let used = 45;
  for (let i = 0; i < points; i++) {
    used += rand(-0.5, 1.2);
    used = Math.max(20, Math.min(95, used));
    const t = new Date(now - (points - i) * hour);
    data.push({
      time: t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + t.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      used: Math.round(used * 10) / 10
    });
  }
  return data;
}

export const mockAlerts: Alert[] = [
  { id: 'a1', timestamp: now - 2 * minute, type: 'cpu_spike', severity: 'warning', message: 'CPU usage exceeded 85%', details: 'CPU at 87.3% for 30 seconds', acknowledged: false },
  { id: 'a2', timestamp: now - 15 * minute, type: 'storage', severity: 'critical', message: 'Storage /data exceeds 90% threshold', details: '/data usage at 92.1%', acknowledged: false },
  { id: 'a3', timestamp: now - 45 * minute, type: 'port_down', severity: 'warning', message: 'Port 8080 is not responding', details: 'HTTP server on port 8080 appears down', acknowledged: false },
  { id: 'a4', timestamp: now - 2 * hour, type: 'script_failure', severity: 'critical', message: 'Backup script failed', details: 'Exit code 1: Permission denied', acknowledged: true },
  { id: 'a5', timestamp: now - 3 * hour, type: 'memory', severity: 'info', message: 'Memory usage at 70%', details: 'Memory usage trending upward', acknowledged: true },
  { id: 'a6', timestamp: now - 5 * hour, type: 'network', severity: 'warning', message: 'High network latency detected', details: 'Ping to 8.8.8.8: 250ms avg', acknowledged: true },
  { id: 'a7', timestamp: now - 8 * hour, type: 'battery', severity: 'info', message: 'Battery below 20%', details: 'Battery at 18%, not charging', acknowledged: true },
  { id: 'a8', timestamp: now - 12 * hour, type: 'cpu_spike', severity: 'critical', message: 'CPU at 98% for over 2 minutes', details: 'Process node consuming 89% CPU', acknowledged: true },
];

export const mockMonitoredPaths: MonitoredPath[] = [
  { id: 'mp1', path: '/data/data/com.termux/files/home', threshold: 80, usedBytes: 2147483648, totalBytes: 4294967296, createdAt: now - 7 * 24 * hour },
  { id: 'mp2', path: '/storage/emulated/0', threshold: 90, usedBytes: 52428800000, totalBytes: 64424509440, createdAt: now - 5 * 24 * hour },
  { id: 'mp3', path: '/data/data/com.termux/files/usr', threshold: 75, usedBytes: 1073741824, totalBytes: 2147483648, createdAt: now - 3 * 24 * hour },
  { id: 'mp4', path: '/tmp', threshold: 85, usedBytes: 107374182, totalBytes: 536870912, createdAt: now - 24 * hour },
];

export const mockMonitoredPorts: MonitoredPort[] = [
  { id: 'port1', port: 8080, protocol: 'tcp', description: 'HTTP Server', active: true, status: 'open', uptime: 98.5 },
  { id: 'port2', port: 3000, protocol: 'tcp', description: 'Node.js Dev Server', active: true, status: 'open', uptime: 95.2 },
  { id: 'port3', port: 5432, protocol: 'tcp', description: 'PostgreSQL', active: true, status: 'closed', uptime: 45.8 },
  { id: 'port4', port: 22, protocol: 'tcp', description: 'SSH (sshd)', active: true, status: 'open', uptime: 99.9 },
  { id: 'port5', port: 6379, protocol: 'tcp', description: 'Redis', active: false, status: 'unknown', uptime: 0 },
];

export const mockProcesses: ProcessInfo[] = [
  { pid: 1, name: 'init', cpu: 0.1, memory: 0.5, status: 'running', user: 'root', startTime: '2h ago', command: '/sbin/init' },
  { pid: 234, name: 'bash', cpu: 0.3, memory: 1.2, status: 'running', user: 'u0_a123', startTime: '1h ago', command: '/data/data/com.termux/files/usr/bin/bash' },
  { pid: 456, name: 'node', cpu: 12.5, memory: 8.4, status: 'running', user: 'u0_a123', startTime: '45m ago', command: 'node server.js' },
  { pid: 789, name: 'python3', cpu: 5.2, memory: 4.1, status: 'running', user: 'u0_a123', startTime: '30m ago', command: 'python3 data_collector.py' },
  { pid: 901, name: 'sshd', cpu: 0.0, memory: 0.8, status: 'sleeping', user: 'root', startTime: '2h ago', command: '/usr/sbin/sshd -D' },
  { pid: 1023, name: 'nginx', cpu: 0.5, memory: 2.1, status: 'running', user: 'u0_a123', startTime: '1h ago', command: 'nginx: master process' },
  { pid: 1024, name: 'nginx', cpu: 0.3, memory: 1.8, status: 'running', user: 'u0_a123', startTime: '1h ago', command: 'nginx: worker process' },
  { pid: 1100, name: 'crond', cpu: 0.0, memory: 0.3, status: 'sleeping', user: 'root', startTime: '2h ago', command: '/usr/sbin/crond' },
  { pid: 1250, name: 'vim', cpu: 0.1, memory: 1.5, status: 'stopped', user: 'u0_a123', startTime: '20m ago', command: 'vim config.yml' },
  { pid: 1300, name: 'top', cpu: 2.0, memory: 0.9, status: 'running', user: 'u0_a123', startTime: '5m ago', command: 'top -b' },
  { pid: 1400, name: 'wget', cpu: 3.1, memory: 1.2, status: 'running', user: 'u0_a123', startTime: '2m ago', command: 'wget https://example.com/large-file.tar.gz' },
  { pid: 1500, name: 'gcc', cpu: 45.2, memory: 12.3, status: 'running', user: 'u0_a123', startTime: '1m ago', command: 'gcc -O2 -o app main.c' },
];

export const mockCronJobs: CronJob[] = [
  { id: 'cj1', schedule: '*/5 * * * *', command: '/home/scripts/health_check.sh', description: 'Health check every 5 min', active: true, lastRun: now - 3 * minute, nextRun: now + 2 * minute },
  { id: 'cj2', schedule: '0 */6 * * *', command: '/home/scripts/backup.sh', description: 'Backup every 6 hours', active: true, lastRun: now - 2 * hour, nextRun: now + 4 * hour },
  { id: 'cj3', schedule: '0 0 * * *', command: '/home/scripts/cleanup.py', description: 'Daily cleanup at midnight', active: true, lastRun: now - 18 * hour, nextRun: now + 6 * hour },
  { id: 'cj4', schedule: '30 2 * * 0', command: '/home/scripts/weekly_report.sh', description: 'Weekly report on Sunday', active: false, lastRun: now - 5 * 24 * hour },
];

export const mockScripts: ScriptEntry[] = [
  { id: 's1', name: 'Health Check', path: '/home/scripts/health_check.sh', description: 'Checks system health and reports', tags: ['monitoring', 'health'], lastRunStatus: 'success', lastRunTime: now - 3 * minute },
  { id: 's2', name: 'Backup Script', path: '/home/scripts/backup.sh', description: 'Full system backup to external storage', tags: ['backup', 'critical'], lastRunStatus: 'success', lastRunTime: now - 2 * hour },
  { id: 's3', name: 'Data Collector', path: '/home/scripts/data_collector.py', description: 'Collects metrics from sensors', tags: ['data', 'python'], lastRunStatus: 'running', lastRunTime: now - 30 * minute },
  { id: 's4', name: 'Log Rotator', path: '/home/scripts/rotate_logs.sh', description: 'Rotates and compresses old logs', tags: ['maintenance'], lastRunStatus: 'failure', lastRunTime: now - 12 * hour },
  { id: 's5', name: 'Deploy App', path: '/home/scripts/deploy.sh', description: 'Deploys latest app version', tags: ['deploy', 'critical'], lastRunStatus: 'never' },
];

export const mockMonitoredFiles: MonitoredFile[] = [
  { id: 'mf1', path: '/var/log/syslog', description: 'System log', active: true, lastModified: now - 30000, size: 1048576 },
  { id: 'mf2', path: '/home/app/server.log', description: 'Application server log', active: true, lastModified: now - 60000, size: 524288 },
  { id: 'mf3', path: '/home/data/metrics.csv', description: 'Metrics data file', active: true, lastModified: now - 300000, size: 2097152 },
  { id: 'mf4', path: '/etc/nginx/nginx.conf', description: 'Nginx configuration', active: false, lastModified: now - 24 * hour, size: 4096 },
];

export const mockFileEvents: FileEvent[] = [
  { id: 'fe1', timestamp: now - 30000, path: '/var/log/syslog', eventType: 'modified', snippet: 'Jan 15 14:32:01 termux CRON[1234]: (user) CMD (health_check.sh)' },
  { id: 'fe2', timestamp: now - 60000, path: '/home/app/server.log', eventType: 'modified', snippet: '[2024-01-15 14:31:00] INFO: Request GET /api/metrics 200 OK (12ms)' },
  { id: 'fe3', timestamp: now - 120000, path: '/home/app/server.log', eventType: 'modified', snippet: '[2024-01-15 14:29:00] WARN: High memory usage detected' },
  { id: 'fe4', timestamp: now - 300000, path: '/home/data/metrics.csv', eventType: 'modified', snippet: '1705325400,cpu,42.3,memory,67.8,disk,54.2' },
  { id: 'fe5', timestamp: now - 600000, path: '/var/log/syslog', eventType: 'modified', snippet: 'Jan 15 14:22:01 termux sshd[5678]: Accepted publickey for user' },
];

export const mockNetworkInterfaces: NetworkInterface[] = [
  { name: 'wlan0', rxBytes: 1073741824, txBytes: 268435456, rxSpeed: 2500, txSpeed: 800 },
  { name: 'rmnet0', rxBytes: 536870912, txBytes: 134217728, rxSpeed: 500, txSpeed: 200 },
  { name: 'lo', rxBytes: 104857600, txBytes: 104857600, rxSpeed: 10000, txSpeed: 10000 },
];

export function generateSystemMetrics(): SystemMetrics {
  return {
    cpuUsage: Math.round(rand(15, 75) * 10) / 10,
    memoryUsage: Math.round(rand(40, 80) * 10) / 10,
    memoryTotal: 4096,
    memoryUsed: Math.round(rand(1600, 3200)),
    swapTotal: 2048,
    swapUsed: Math.round(rand(200, 800)),
    uptime: 172845,
    loadAvg: [
      Math.round(rand(0.5, 3.5) * 100) / 100,
      Math.round(rand(0.8, 2.8) * 100) / 100,
      Math.round(rand(0.6, 2.2) * 100) / 100
    ],
    cpuTemp: Math.round(rand(35, 65) * 10) / 10,
    batteryLevel: randInt(20, 95),
    batteryCharging: Math.random() > 0.5,
    processCount: randInt(40, 80),
    networkLatency: Math.round(rand(5, 150) * 10) / 10,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1048576) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / 1048576).toFixed(2)} MB/s`;
}

export function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function generateMockFileEvents(): FileEvent[] {
  return [
    { id: 'fe1', timestamp: now - 5 * minute, path: '/var/log/syslog', eventType: 'modified', snippet: 'System log updated with new entries' },
    { id: 'fe2', timestamp: now - 15 * minute, path: '/tmp/output.log', eventType: 'created', snippet: 'New output file created by script' },
    { id: 'fe3', timestamp: now - 30 * minute, path: '/home/user/.bashrc', eventType: 'modified', snippet: 'Added new alias definitions' },
    { id: 'fe4', timestamp: now - hour, path: '/tmp/cache.dat', eventType: 'deleted', snippet: 'Cache file removed' },
    { id: 'fe5', timestamp: now - 2 * hour, path: '/var/log/auth.log', eventType: 'modified', snippet: 'Authentication event logged' },
  ];
}
