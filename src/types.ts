export interface Alert {
  id: string;
  timestamp: number;
  type: 'storage' | 'cpu_spike' | 'port_down' | 'script_failure' | 'memory' | 'network' | 'battery';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  details: string;
  acknowledged: boolean;
  note?: string;
}

export interface MonitoredPath {
  id: string;
  path: string;
  threshold: number;
  usedBytes: number;
  totalBytes: number;
  createdAt: number;
}

export interface MonitoredPort {
  id: string;
  port: number;
  protocol: 'tcp' | 'udp';
  description: string;
  active: boolean;
  status: 'open' | 'closed' | 'unknown';
  uptime: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: 'running' | 'sleeping' | 'stopped' | 'zombie';
  user: string;
  startTime: string;
  command: string;
}

export interface CronJob {
  id: string;
  schedule: string;
  command: string;
  description: string;
  active: boolean;
  lastRun?: number;
  nextRun?: number;
}

export interface ScriptEntry {
  id: string;
  name: string;
  path: string;
  description: string;
  tags: string[];
  lastRunStatus: 'success' | 'failure' | 'running' | 'never';
  lastRunTime?: number;
}

export interface MonitoredFile {
  id: string;
  path: string;
  description: string;
  active: boolean;
  lastModified?: number;
  size?: number;
}

export interface FileEvent {
  id: string;
  timestamp: number;
  path: string;
  eventType: 'modified' | 'created' | 'deleted';
  snippet?: string;
}

export interface MetricPoint {
  time: string;
  value: number;
}

export interface NetworkInterface {
  name: string;
  rxBytes: number;
  txBytes: number;
  rxSpeed: number;
  txSpeed: number;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  memoryUsed: number;
  swapTotal: number;
  swapUsed: number;
  uptime: number;
  loadAvg: [number, number, number];
  cpuTemp: number;
  batteryLevel: number;
  batteryCharging: boolean;
  processCount: number;
  networkLatency: number;
}

export interface Settings {
  refreshInterval: number;
  cpuThreshold: number;
  memoryThreshold: number;
  storageThreshold: number;
  retentionDays: number;
  loginEnabled: boolean;
  notificationsEnabled: boolean;
  toastNotifications: boolean;
  termuxNotifications: boolean;
}

export type Theme = 'dark' | 'light';
