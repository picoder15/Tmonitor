import { create } from 'zustand';
import type { Theme, Alert, MonitoredPath, MonitoredPort, ProcessInfo, CronJob, ScriptEntry, MonitoredFile, FileEvent, Settings, SystemMetrics } from './types';
import { mockAlerts, mockMonitoredPaths, mockMonitoredPorts, mockProcesses, mockCronJobs, mockScripts, mockMonitoredFiles, generateSystemMetrics, generateMockFileEvents } from './data/mockData';
import {
  apiGetSystemOverview, apiGetProcesses, apiGetAlerts,
  apiGetMonitoredPaths, apiGetMonitoredPorts, apiGetScripts,
  apiGetCronJobs, apiGetMonitoredFiles, apiGetFileEvents,
  apiGetSettings, apiCheckAuth,
  apiKillProcess, apiSuspendProcess, apiResumeProcess,
  apiAcknowledgeAlert, apiDeleteAlert,
  apiAddMonitoredPath, apiRemoveMonitoredPath,
  apiAddMonitoredPort, apiRemoveMonitoredPort,
  apiAddScript, apiDeleteScript, apiRunScript,
  apiAddCronJob, apiDeleteCronJob, apiToggleCronJob,
  apiAddMonitoredFile, apiRemoveMonitoredFile,
  apiUpdateSettings, apiLogin,
} from './api';

interface AppState {
  theme: Theme;
  demoMode: boolean;
  isAuthenticated: boolean;
  sidebarOpen: boolean;
  currentPage: string;
  metrics: SystemMetrics;
  alerts: Alert[];
  monitoredPaths: MonitoredPath[];
  monitoredPorts: MonitoredPort[];
  processes: ProcessInfo[];
  cronJobs: CronJob[];
  scripts: ScriptEntry[];
  monitoredFiles: MonitoredFile[];
  fileEvents: FileEvent[];
  settings: Settings;
  tourActive: boolean;
  backendAvailable: boolean;
  pollingTimers: ReturnType<typeof setInterval>[];

  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  toggleDemoMode: () => void;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  setSidebarOpen: (v: boolean) => void;
  setCurrentPage: (p: string) => void;
  refreshMetrics: () => void;
  acknowledgeAlert: (id: string) => void;
  addAlert: (a: Omit<Alert, 'id'>) => void;
  deleteAlert: (id: string) => void;
  addMonitoredPath: (p: Omit<MonitoredPath, 'id' | 'createdAt' | 'usedBytes' | 'totalBytes'>) => void;
  removeMonitoredPath: (id: string) => void;
  addMonitoredPort: (p: Omit<MonitoredPort, 'id' | 'status' | 'uptime'>) => void;
  removeMonitoredPort: (id: string) => void;
  killProcess: (pid: number) => void;
  suspendProcess: (pid: number) => void;
  resumeProcess: (pid: number) => void;
  addCronJob: (j: Omit<CronJob, 'id'>) => void;
  removeCronJob: (id: string) => void;
  toggleCronJob: (id: string) => void;
  addScript: (s: Omit<ScriptEntry, 'id'>) => void;
  removeScript: (id: string) => void;
  runScript: (id: string) => void;
  addMonitoredFile: (f: Omit<MonitoredFile, 'id'>) => void;
  removeMonitoredFile: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  setTourActive: (v: boolean) => void;
  startPolling: () => void;
  stopPolling: () => void;
  fetchAllData: () => Promise<void>;
}

const savedTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('termux-theme') : null) as Theme | null;
const savedLogin = typeof localStorage !== 'undefined' ? localStorage.getItem('termux-login') : null;
const savedDemoMode = typeof localStorage !== 'undefined' ? localStorage.getItem('termux-demo') : null;

export const useStore = create<AppState>((set, get) => ({
  theme: savedTheme || 'dark',
  demoMode: savedDemoMode !== null ? savedDemoMode === 'true' : true,
  isAuthenticated: savedLogin === 'true' || false,
  sidebarOpen: true,
  currentPage: 'dashboard',
  metrics: generateSystemMetrics(),
  alerts: [...mockAlerts],
  monitoredPaths: [...mockMonitoredPaths],
  monitoredPorts: [...mockMonitoredPorts],
  processes: [...mockProcesses],
  cronJobs: [...mockCronJobs],
  scripts: [...mockScripts],
  monitoredFiles: [...mockMonitoredFiles],
  fileEvents: [...generateMockFileEvents()],
  settings: {
    refreshInterval: 5,
    cpuThreshold: 85,
    memoryThreshold: 80,
    storageThreshold: 90,
    retentionDays: 30,
    loginEnabled: true,
    notificationsEnabled: true,
    toastNotifications: true,
    termuxNotifications: false,
  },
  tourActive: false,
  backendAvailable: false,
  pollingTimers: [],

  toggleTheme: () => set(state => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('termux-theme', next);
    return { theme: next };
  }),
  setTheme: (t) => { localStorage.setItem('termux-theme', t); set({ theme: t }); },

  toggleDemoMode: () => set(state => {
    const next = !state.demoMode;
    localStorage.setItem('termux-demo', String(next));
    if (next) {
      // Switching to demo mode - load mock data
      get().stopPolling();
      return {
        demoMode: true,
        metrics: generateSystemMetrics(),
        alerts: [...mockAlerts],
        monitoredPaths: [...mockMonitoredPaths],
        monitoredPorts: [...mockMonitoredPorts],
        processes: [...mockProcesses],
        cronJobs: [...mockCronJobs],
        scripts: [...mockScripts],
        monitoredFiles: [...mockMonitoredFiles],
        fileEvents: [...generateMockFileEvents()],
      };
    } else {
      // Switching to real mode - start fetching from API
      setTimeout(() => {
        get().fetchAllData();
        get().startPolling();
      }, 100);
      return { demoMode: false };
    }
  }),

  login: async (u, p) => {
    // Try backend login first
    const result = await apiLogin(u, p);
    if (result?.success) {
      localStorage.setItem('termux-login', 'true');
      set({ isAuthenticated: true });
      return true;
    }
    // Fallback: local check
    if (u === 'admin' && p === 'More@123') {
      localStorage.setItem('termux-login', 'true');
      set({ isAuthenticated: true });
      return true;
    }
    return false;
  },
  logout: () => { localStorage.removeItem('termux-login'); set({ isAuthenticated: false }); },
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setCurrentPage: (p) => set({ currentPage: p }),

  refreshMetrics: () => {
    const state = get();
    if (state.demoMode) {
      set({ metrics: generateSystemMetrics() });
    } else {
      state.fetchAllData();
    }
  },

  acknowledgeAlert: (id) => {
    const state = get();
    if (!state.demoMode) {
      apiAcknowledgeAlert(id);
    }
    set(s => ({
      alerts: s.alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a)
    }));
  },

  addAlert: (a) => set(state => ({
    alerts: [{ ...a, id: 'a' + Date.now() }, ...state.alerts]
  })),

  deleteAlert: (id) => {
    const state = get();
    if (!state.demoMode) {
      apiDeleteAlert(id);
    }
    set(s => ({
      alerts: s.alerts.filter(a => a.id !== id)
    }));
  },

  addMonitoredPath: (p) => {
    const state = get();
    if (!state.demoMode) {
      apiAddMonitoredPath(p.path, p.threshold).then(() => state.fetchAllData());
    }
    set(s => ({
      monitoredPaths: [...s.monitoredPaths, {
        ...p, id: 'mp' + Date.now(),
        createdAt: Date.now(),
        usedBytes: Math.round(Math.random() * 2147483648),
        totalBytes: 4294967296,
      }]
    }));
  },

  removeMonitoredPath: (id) => {
    const state = get();
    if (!state.demoMode) {
      apiRemoveMonitoredPath(id);
    }
    set(s => ({
      monitoredPaths: s.monitoredPaths.filter(p => p.id !== id)
    }));
  },

  addMonitoredPort: (p) => {
    const state = get();
    if (!state.demoMode) {
      apiAddMonitoredPort(p.port, p.protocol, p.description).then(() => state.fetchAllData());
    }
    set(s => ({
      monitoredPorts: [...s.monitoredPorts, {
        ...p, id: 'port' + Date.now(),
        status: 'unknown' as const, uptime: 0
      }]
    }));
  },

  removeMonitoredPort: (id) => {
    const state = get();
    if (!state.demoMode) {
      apiRemoveMonitoredPort(id);
    }
    set(s => ({
      monitoredPorts: s.monitoredPorts.filter(p => p.id !== id)
    }));
  },

  killProcess: (pid) => {
    const state = get();
    const proc = state.processes.find(p => p.pid === pid);
    if (!state.demoMode && proc) {
      apiKillProcess(pid, proc.name);
    }
    set(s => ({
      processes: s.processes.filter(p => p.pid !== pid)
    }));
  },

  suspendProcess: (pid) => {
    const state = get();
    const proc = state.processes.find(p => p.pid === pid);
    if (!state.demoMode && proc) {
      apiSuspendProcess(pid, proc.name);
    }
    set(s => ({
      processes: s.processes.map(p => p.pid === pid ? { ...p, status: 'stopped' as const } : p)
    }));
  },

  resumeProcess: (pid) => {
    const state = get();
    const proc = state.processes.find(p => p.pid === pid);
    if (!state.demoMode && proc) {
      apiResumeProcess(pid, proc.name);
    }
    set(s => ({
      processes: s.processes.map(p => p.pid === pid ? { ...p, status: 'running' as const } : p)
    }));
  },

  addCronJob: (j) => {
    const state = get();
    if (!state.demoMode) {
      apiAddCronJob(j.schedule, j.command, j.description).then(() => state.fetchAllData());
    }
    set(s => ({
      cronJobs: [...s.cronJobs, { ...j, id: 'cj' + Date.now() }]
    }));
  },

  removeCronJob: (id) => {
    const state = get();
    if (!state.demoMode) {
      apiDeleteCronJob(id);
    }
    set(s => ({
      cronJobs: s.cronJobs.filter(j => j.id !== id)
    }));
  },

  toggleCronJob: (id) => {
    const state = get();
    if (!state.demoMode) {
      apiToggleCronJob(id);
    }
    set(s => ({
      cronJobs: s.cronJobs.map(j => j.id === id ? { ...j, active: !j.active } : j)
    }));
  },

  addScript: (s) => {
    const state = get();
    if (!state.demoMode) {
      apiAddScript(s.name, s.path, s.description, s.tags).then(() => state.fetchAllData());
    }
    set(st => ({
      scripts: [...st.scripts, { ...s, id: 's' + Date.now() }]
    }));
  },

  removeScript: (id) => {
    const state = get();
    if (!state.demoMode) {
      apiDeleteScript(id);
    }
    set(s => ({
      scripts: s.scripts.filter(sc => sc.id !== id)
    }));
  },

  runScript: (id) => {
    const state = get();
    if (!state.demoMode) {
      apiRunScript(id);
    }
    set(s => ({
      scripts: s.scripts.map(sc => sc.id === id ? { ...sc, lastRunStatus: 'running' as const, lastRunTime: Date.now() } : sc)
    }));
  },

  addMonitoredFile: (f) => {
    const state = get();
    if (!state.demoMode) {
      apiAddMonitoredFile(f.path, f.description).then(() => state.fetchAllData());
    }
    set(s => ({
      monitoredFiles: [...s.monitoredFiles, { ...f, id: 'mf' + Date.now() }]
    }));
  },

  removeMonitoredFile: (id) => {
    const state = get();
    if (!state.demoMode) {
      apiRemoveMonitoredFile(id);
    }
    set(s => ({
      monitoredFiles: s.monitoredFiles.filter(f => f.id !== id)
    }));
  },

  updateSettings: (s) => {
    const state = get();
    if (!state.demoMode) {
      apiUpdateSettings(s);
    }
    set(st => ({
      settings: { ...st.settings, ...s }
    }));
  },

  setTourActive: (v) => set({ tourActive: v }),

  // ─── API Data Fetching ───

  fetchAllData: async () => {
    const state = get();
    if (state.demoMode) return;

    try {
      // Fetch system overview
      const overview = await apiGetSystemOverview();
      if (overview) {
        set({
          backendAvailable: true,
          metrics: {
            cpuUsage: overview.cpuUsage,
            memoryUsage: overview.memoryUsage,
            memoryTotal: overview.memoryTotal,
            memoryUsed: overview.memoryUsed,
            swapTotal: overview.swapTotal,
            swapUsed: overview.swapUsed,
            uptime: overview.uptime,
            loadAvg: overview.loadAvg,
            cpuTemp: overview.cpuTemp,
            batteryLevel: overview.batteryLevel,
            batteryCharging: overview.batteryCharging,
            processCount: overview.processCount,
            networkLatency: overview.networkLatency,
          }
        });
      }

      // Fetch processes
      const processes = await apiGetProcesses();
      if (processes) {
        set({
          processes: processes.map(p => ({
            ...p,
            status: (p.status as ProcessInfo['status']) || 'running'
          }))
        });
      }

      // Fetch alerts
      const alerts = await apiGetAlerts();
      if (alerts) {
        set({
          alerts: alerts.map(a => ({
            ...a,
            type: a.type as Alert['type'],
            severity: a.severity as Alert['severity'],
          }))
        });
      }

      // Fetch monitored paths
      const paths = await apiGetMonitoredPaths();
      if (paths) {
        set({ monitoredPaths: paths });
      }

      // Fetch monitored ports
      const ports = await apiGetMonitoredPorts();
      if (ports) {
        set({
          monitoredPorts: ports.map(p => ({
            ...p,
            protocol: p.protocol as MonitoredPort['protocol'],
            status: p.status as MonitoredPort['status'],
          }))
        });
      }

      // Fetch scripts
      const scripts = await apiGetScripts();
      if (scripts) {
        set({
          scripts: scripts.map(s => ({
            ...s,
            lastRunStatus: s.lastRunStatus as ScriptEntry['lastRunStatus'],
            lastRunTime: s.lastRunTime ?? undefined,
          }))
        });
      }

      // Fetch cron jobs
      const crons = await apiGetCronJobs();
      if (crons) {
        set({
          cronJobs: crons.map(c => ({
            ...c,
            lastRun: c.lastRun ?? undefined,
            nextRun: c.nextRun ?? undefined,
          }))
        });
      }

      // Fetch monitored files
      const files = await apiGetMonitoredFiles();
      if (files) {
        set({
          monitoredFiles: files.map(f => ({
            ...f,
            lastModified: f.lastModified ?? undefined,
            size: f.size ?? undefined,
          }))
        });
      }

      // Fetch file events
      const events = await apiGetFileEvents();
      if (events) {
        set({
          fileEvents: events.map(e => ({
            ...e,
            eventType: e.eventType as FileEvent['eventType'],
          }))
        });
      }

      // Fetch settings
      const settings = await apiGetSettings();
      if (settings) {
        set({ settings });
      }

      // Check auth config
      const auth = await apiCheckAuth();
      if (auth) {
        set(s => ({
          settings: { ...s.settings, loginEnabled: auth.loginEnabled }
        }));
      }

    } catch (error) {
      console.warn('Failed to fetch data from backend:', error);
    }
  },

  startPolling: () => {
    const state = get();
    state.stopPolling(); // Clear any existing timers

    if (state.demoMode) {
      // Demo mode polling - refresh mock metrics
      const demoTimer = setInterval(() => {
        set({ metrics: generateSystemMetrics() });
      }, 5000);
      set({ pollingTimers: [demoTimer] });
      return;
    }

    // Real mode - poll the backend API
    const interval = (state.settings.refreshInterval || 5) * 1000;

    // Quick polling for metrics (every refresh interval)
    const metricsTimer = setInterval(async () => {
      const s = get();
      if (s.demoMode) return;
      const overview = await apiGetSystemOverview();
      if (overview) {
        set({
          backendAvailable: true,
          metrics: {
            cpuUsage: overview.cpuUsage,
            memoryUsage: overview.memoryUsage,
            memoryTotal: overview.memoryTotal,
            memoryUsed: overview.memoryUsed,
            swapTotal: overview.swapTotal,
            swapUsed: overview.swapUsed,
            uptime: overview.uptime,
            loadAvg: overview.loadAvg,
            cpuTemp: overview.cpuTemp,
            batteryLevel: overview.batteryLevel,
            batteryCharging: overview.batteryCharging,
            processCount: overview.processCount,
            networkLatency: overview.networkLatency,
          }
        });
      }
    }, interval);

    // Slower polling for other data (every 15 seconds)
    const dataTimer = setInterval(async () => {
      const s = get();
      if (s.demoMode) return;

      const [processes, alerts, paths, ports] = await Promise.all([
        apiGetProcesses(),
        apiGetAlerts(),
        apiGetMonitoredPaths(),
        apiGetMonitoredPorts(),
      ]);

      const updates: Partial<AppState> = {};
      if (processes) {
        updates.processes = processes.map(p => ({
          ...p,
          status: (p.status as ProcessInfo['status']) || 'running'
        }));
      }
      if (alerts) {
        updates.alerts = alerts.map(a => ({
          ...a,
          type: a.type as Alert['type'],
          severity: a.severity as Alert['severity'],
        }));
      }
      if (paths) updates.monitoredPaths = paths;
      if (ports) {
        updates.monitoredPorts = ports.map(p => ({
          ...p,
          protocol: p.protocol as MonitoredPort['protocol'],
          status: p.status as MonitoredPort['status'],
        }));
      }

      if (Object.keys(updates).length > 0) {
        set(updates as Partial<AppState>);
      }
    }, 15000);

    set({ pollingTimers: [metricsTimer, dataTimer] });
  },

  stopPolling: () => {
    const state = get();
    state.pollingTimers.forEach(timer => clearInterval(timer));
    set({ pollingTimers: [] });
  },
}));
