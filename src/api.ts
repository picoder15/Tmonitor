/**
 * API service for communicating with the Flask backend.
 * All functions return promises and handle errors gracefully.
 */

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!response.ok) {
      console.warn(`API ${url} returned ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    // API not available (demo mode or frontend-only)
    return null;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  return fetchJson<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ─── Auth ───

export async function apiLogin(username: string, password: string) {
  return postJson<{ success: boolean; message: string }>('/auth/login', { username, password });
}

export async function apiCheckAuth() {
  return fetchJson<{ loginEnabled: boolean; username: string }>('/auth/check');
}

// ─── System ───

export interface SystemOverview {
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
  timestamp: number;
}

export async function apiGetSystemOverview() {
  return fetchJson<SystemOverview>('/system/overview');
}

// ─── CPU History ───

export interface HistoryPoint {
  time: string;
  value: number;
  cpu?: number;
  processes?: number;
}

export async function apiGetCpuHistory(limit = 60) {
  return fetchJson<HistoryPoint[]>(`/cpu/history?limit=${limit}`);
}

export async function apiGetMemoryHistory(limit = 60) {
  return fetchJson<HistoryPoint[]>(`/memory/history?limit=${limit}`);
}

// ─── Processes ───

export interface ApiProcess {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  status: string;
  user: string;
  startTime: string;
  command: string;
}

export async function apiGetProcesses() {
  return fetchJson<ApiProcess[]>('/processes');
}

export async function apiKillProcess(pid: number, name: string, sig = 15) {
  return postJson<{ success: boolean; message: string }>('/processes/kill', { pid, name, signal: sig });
}

export async function apiSuspendProcess(pid: number, name: string) {
  return postJson<{ success: boolean; message: string }>('/processes/suspend', { pid, name });
}

export async function apiResumeProcess(pid: number, name: string) {
  return postJson<{ success: boolean; message: string }>('/processes/resume', { pid, name });
}

// ─── Storage ───

export interface ApiMonitoredPath {
  id: string;
  path: string;
  threshold: number;
  usedBytes: number;
  totalBytes: number;
  createdAt: number;
}

export async function apiGetMonitoredPaths() {
  return fetchJson<ApiMonitoredPath[]>('/storage/monitored');
}

export async function apiAddMonitoredPath(path: string, threshold: number) {
  return postJson<{ success: boolean; message: string }>('/storage/monitored', { path, threshold });
}

export async function apiRemoveMonitoredPath(id: string) {
  return fetchJson<{ success: boolean }>(`/storage/monitored/${id}`, { method: 'DELETE' });
}

export async function apiGetStorageHistory(pathId: string, limit = 100) {
  return fetchJson<HistoryPoint[]>(`/storage/history/${pathId}?limit=${limit}`);
}

// ─── Network ───

export interface NetworkCurrent {
  download: number;
  upload: number;
  latency: number;
  interfaces: { name: string; rxBytes: number; txBytes: number; rxSpeed: number; txSpeed: number }[];
}

export async function apiGetNetworkCurrent() {
  return fetchJson<NetworkCurrent>('/network/current');
}

export interface NetworkSpeedPoint {
  time: string;
  download: number;
  upload: number;
}

export async function apiGetNetworkHistory(limit = 60) {
  return fetchJson<NetworkSpeedPoint[]>(`/network/history?limit=${limit}`);
}

export async function apiGetLatencyHistory(limit = 60) {
  return fetchJson<HistoryPoint[]>(`/network/latency/history?limit=${limit}`);
}

// ─── Ports ───

export interface ApiMonitoredPort {
  id: string;
  port: number;
  protocol: string;
  description: string;
  active: boolean;
  status: string;
  uptime: number;
}

export async function apiGetMonitoredPorts() {
  return fetchJson<ApiMonitoredPort[]>('/ports/monitored');
}

export async function apiAddMonitoredPort(port: number, protocol: string, description: string) {
  return postJson<{ success: boolean; message: string }>('/ports/monitored', { port, protocol, description });
}

export async function apiRemoveMonitoredPort(id: string) {
  return fetchJson<{ success: boolean }>(`/ports/monitored/${id}`, { method: 'DELETE' });
}

// ─── Alerts ───

export interface ApiAlert {
  id: string;
  timestamp: number;
  type: string;
  severity: string;
  message: string;
  details: string;
  acknowledged: boolean;
  note: string;
}

export async function apiGetAlerts(limit = 100) {
  return fetchJson<ApiAlert[]>(`/alerts?limit=${limit}`);
}

export async function apiAcknowledgeAlert(id: string, note = '') {
  return postJson<{ success: boolean }>(`/alerts/${id}/acknowledge`, { note });
}

export async function apiDeleteAlert(id: string) {
  return fetchJson<{ success: boolean }>(`/alerts/${id}`, { method: 'DELETE' });
}

// ─── Scripts ───

export interface ApiScript {
  id: string;
  name: string;
  path: string;
  description: string;
  tags: string[];
  lastRunStatus: string;
  lastRunTime: number | null;
}

export async function apiGetScripts() {
  return fetchJson<ApiScript[]>('/scripts');
}

export async function apiAddScript(name: string, path: string, description: string, tags: string[]) {
  return postJson<{ success: boolean }>('/scripts', { name, path, description, tags });
}

export async function apiDeleteScript(id: string) {
  return fetchJson<{ success: boolean }>(`/scripts/${id}`, { method: 'DELETE' });
}

export async function apiRunScript(id: string) {
  return postJson<{ success: boolean; message: string; pid?: number }>(`/scripts/${id}/run`, {});
}

export async function apiStopScript(id: string) {
  return postJson<{ success: boolean }>(`/scripts/${id}/stop`, {});
}

// ─── Cron Jobs ───

export interface ApiCronJob {
  id: string;
  schedule: string;
  command: string;
  description: string;
  active: boolean;
  lastRun: number | null;
  nextRun: number | null;
  source?: string;
}

export async function apiGetCronJobs() {
  return fetchJson<ApiCronJob[]>('/cron/jobs');
}

export async function apiAddCronJob(schedule: string, command: string, description: string) {
  return postJson<{ success: boolean }>('/cron/jobs', { schedule, command, description });
}

export async function apiDeleteCronJob(id: string) {
  return fetchJson<{ success: boolean }>(`/cron/jobs/${id}`, { method: 'DELETE' });
}

export async function apiToggleCronJob(id: string) {
  return fetchJson<{ success: boolean; active: boolean }>(`/cron/jobs/${id}/toggle`, { method: 'PUT' });
}

// ─── Files ───

export interface ApiMonitoredFile {
  id: string;
  path: string;
  description: string;
  active: boolean;
  lastModified: number | null;
  size: number;
}

export async function apiGetMonitoredFiles() {
  return fetchJson<ApiMonitoredFile[]>('/files/monitored');
}

export async function apiAddMonitoredFile(path: string, description: string) {
  return postJson<{ success: boolean }>('/files/monitored', { path, description });
}

export async function apiRemoveMonitoredFile(id: string) {
  return fetchJson<{ success: boolean }>(`/files/monitored/${id}`, { method: 'DELETE' });
}

export async function apiGetFileContent(fileId: string, lines = 100) {
  return fetchJson<{ path: string; content: string[]; lineCount: number }>(`/files/${fileId}/content?lines=${lines}`);
}

export interface ApiFileEvent {
  id: string;
  timestamp: number;
  path: string;
  eventType: string;
  snippet: string;
}

export async function apiGetFileEvents(fileId?: string, limit = 100) {
  if (fileId) {
    return fetchJson<ApiFileEvent[]>(`/files/${fileId}/events?limit=${limit}`);
  }
  return fetchJson<ApiFileEvent[]>(`/files/events?limit=${limit}`);
}

// ─── Settings ───

export interface ApiSettings {
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

export async function apiGetSettings() {
  return fetchJson<ApiSettings>('/settings');
}

export async function apiUpdateSettings(settings: Partial<ApiSettings>) {
  return postJson<{ success: boolean }>('/settings', settings);
}

// ─── Data Export ───

export async function apiExportData(table: string, format: string) {
  try {
    const response = await fetch(`${API_BASE}/data/export?table=${table}&format=${format}`);
    if (format === 'csv') {
      return await response.text();
    }
    return await response.json();
  } catch {
    return null;
  }
}

export async function apiCleanupData(retentionDays: number) {
  return postJson<{ success: boolean }>('/data/cleanup', { retentionDays });
}

// ─── System Info ───

export async function apiGetSystemInfo() {
  return fetchJson<Record<string, unknown>>('/system/info');
}
