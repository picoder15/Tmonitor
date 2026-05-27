import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { generateTimeSeriesData, generateDualTimeSeries, formatUptime, formatBytes, formatSpeed } from '../data/mockData';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Cpu, MemoryStick, Wifi, Thermometer, Battery, BatteryCharging,
  Activity, Clock, ArrowUp, ArrowDown, Gauge, Server
} from 'lucide-react';

function MetricCard({ icon: Icon, label, value, subValue, color, trend }: {
  icon: React.ElementType; label: string; value: string; subValue?: string; color: string; trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)] hover:border-[var(--border-hover)] transition-all duration-300 hover:shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-red-400' : 'text-emerald-400'}`}>
            {trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {trend === 'up' ? '+2.3%' : '-1.5%'}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-[var(--text-muted)] mt-0.5">{label}</p>
      {subValue && <p className="text-xs text-[var(--text-muted)] mt-1">{subValue}</p>}
    </div>
  );
}

function GaugeChart({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const radius = 60;
  const circumference = Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke="var(--border-color)" strokeWidth="10" strokeLinecap="round" />
        <path d="M 10 75 A 60 60 0 0 1 130 75" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${circumference}`} strokeDashoffset={offset}
          className="transition-all duration-1000" />
        <text x="70" y="65" textAnchor="middle" fill="var(--text-primary)" fontSize="22" fontWeight="bold">{Math.round(pct)}%</text>
      </svg>
      <span className="text-xs text-[var(--text-muted)] mt-1">{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const { metrics, refreshMetrics, monitoredPaths, monitoredPorts, alerts, processes, settings } = useStore();
  const [cpuHistory, setCpuHistory] = useState(() => generateTimeSeriesData(60, 10, 90));
  const [memHistory, setMemHistory] = useState(() => generateTimeSeriesData(60, 30, 85));
  const dualData = useMemo(() => generateDualTimeSeries(60), []);
  const theme = useStore(s => s.theme);

  useEffect(() => {
    const iv = setInterval(() => {
      refreshMetrics();
      setCpuHistory(prev => {
        const next = [...prev.slice(1)];
        const t = new Date();
        next.push({
          time: t.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          value: Math.round((10 + Math.random() * 80) * 10) / 10
        });
        return next;
      });
      setMemHistory(prev => {
        const next = [...prev.slice(1)];
        const t = new Date();
        next.push({
          time: t.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          value: Math.round((30 + Math.random() * 55) * 10) / 10
        });
        return next;
      });
    }, settings.refreshInterval * 1000);
    return () => clearInterval(iv);
  }, [settings.refreshInterval, refreshMetrics]);

  const storageData = monitoredPaths.map(p => ({
    name: p.path.split('/').pop() || p.path,
    used: Math.round(p.usedBytes / 1073741824 * 10) / 10,
    free: Math.round((p.totalBytes - p.usedBytes) / 1073741824 * 10) / 10,
  }));

  const portsUp = monitoredPorts.filter(p => p.status === 'open').length;
  const unackAlerts = alerts.filter(a => !a.acknowledged).length;

  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px',
    color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <MetricCard icon={Cpu} label="CPU Usage" value={`${metrics.cpuUsage}%`} color="bg-blue-500" trend="up" />
        <MetricCard icon={MemoryStick} label="Memory" value={`${metrics.memoryUsage}%`} subValue={`${metrics.memoryUsed}/${metrics.memoryTotal} MB`} color="bg-purple-500" trend="up" />
        <MetricCard icon={Clock} label="Uptime" value={formatUptime(metrics.uptime)} color="bg-emerald-500" />
        <MetricCard icon={Thermometer} label="CPU Temp" value={`${metrics.cpuTemp}°C`} color="bg-orange-500" trend={metrics.cpuTemp > 55 ? 'up' : 'down'} />
        <MetricCard icon={metrics.batteryCharging ? BatteryCharging : Battery} label="Battery" value={`${metrics.batteryLevel}%`} subValue={metrics.batteryCharging ? 'Charging' : 'Discharging'} color="bg-green-500" />
        <MetricCard icon={Activity} label="Load Avg" value={`${metrics.loadAvg[0]}`} subValue={`${metrics.loadAvg[0]} / ${metrics.loadAvg[1]} / ${metrics.loadAvg[2]}`} color="bg-cyan-500" />
      </div>

      {/* Gauges */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <h3 className="text-lg font-semibold mb-4">System Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          <GaugeChart value={metrics.cpuUsage} max={100} label="CPU" color="#3b82f6" />
          <GaugeChart value={metrics.memoryUsage} max={100} label="Memory" color="#8b5cf6" />
          <GaugeChart value={metrics.swapUsed} max={metrics.swapTotal} label="Swap" color="#f59e0b" />
          <GaugeChart value={metrics.batteryLevel} max={100} label="Battery" color="#10b981" />
          <GaugeChart value={metrics.cpuTemp} max={100} label="Temperature" color="#ef4444" />
          <GaugeChart value={metrics.networkLatency} max={300} label="Latency (ms)" color="#06b6d4" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU History */}
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold mb-4">CPU Usage History</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={cpuHistory}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={14} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#cpuGrad)" strokeWidth={2} name="CPU %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Memory History */}
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold mb-4">Memory Usage History</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={memHistory}>
              <defs>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={14} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="url(#memGrad)" strokeWidth={2} name="Memory %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CPU-Process Correlation & Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold mb-4">CPU vs Process Count</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dualData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={14} />
              <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line yAxisId="left" type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} name="CPU %" />
              <Line yAxisId="right" type="monotone" dataKey="processes" stroke="#f59e0b" strokeWidth={2} dot={false} name="Processes" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold mb-4">Storage Usage</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={storageData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} unit=" GB" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={80} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="used" stackId="a" fill="#3b82f6" name="Used" radius={[0, 0, 0, 0]} />
              <Bar dataKey="free" stackId="a" fill="var(--border-color)" name="Free" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Network */}
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-4">
            <Wifi className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold">Network</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Download</span>
              <span className="text-sm font-medium flex items-center gap-1"><ArrowDown className="w-3 h-3 text-emerald-400" />{formatSpeed(2500)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Upload</span>
              <span className="text-sm font-medium flex items-center gap-1"><ArrowUp className="w-3 h-3 text-blue-400" />{formatSpeed(800)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Latency</span>
              <span className="text-sm font-medium">{metrics.networkLatency}ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Total RX</span>
              <span className="text-sm font-medium">{formatBytes(1073741824)}</span>
            </div>
          </div>
        </div>

        {/* Ports */}
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold">Ports</h3>
          </div>
          <div className="space-y-2">
            {monitoredPorts.slice(0, 4).map(port => (
              <div key={port.id} className="flex items-center justify-between">
                <span className="text-sm">{port.port} <span className="text-[var(--text-muted)]">({port.description})</span></span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  port.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>{port.status}</span>
              </div>
            ))}
            <p className="text-xs text-[var(--text-muted)] pt-1">{portsUp}/{monitoredPorts.length} ports active</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold">Quick Stats</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Processes</span>
              <span className="text-sm font-medium">{processes.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Active Alerts</span>
              <span className={`text-sm font-medium ${unackAlerts > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{unackAlerts}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Login Sessions</span>
              <span className="text-sm font-medium">2</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Uptime</span>
              <span className="text-sm font-medium">{formatUptime(metrics.uptime)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
