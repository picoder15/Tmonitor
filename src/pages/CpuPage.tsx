import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { generateTimeSeriesData, generateDualTimeSeries } from '../data/mockData';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ScatterChart, Scatter
} from 'recharts';
import { Cpu, RefreshCw } from 'lucide-react';

export default function CpuPage() {
  const { metrics, refreshMetrics, processes, settings, theme } = useStore();
  const [cpuHistory, setCpuHistory] = useState(() => generateTimeSeriesData(120, 10, 90, 5000));
  const dualData = useMemo(() => generateDualTimeSeries(120), []);
  const scatterData = useMemo(() => dualData.map(d => ({ cpu: d.cpu, processes: d.processes })), [dualData]);

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
    }, settings.refreshInterval * 1000);
    return () => clearInterval(iv);
  }, [settings.refreshInterval, refreshMetrics]);

  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px',
    color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
  };

  const topCpu = [...processes].sort((a, b) => b.cpu - a.cpu).slice(0, 5);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* CPU Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-2"><Cpu className="w-5 h-5 text-blue-400" /><span className="text-sm text-[var(--text-muted)]">Current CPU</span></div>
          <p className="text-3xl font-bold">{metrics.cpuUsage}%</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <p className="text-sm text-[var(--text-muted)] mb-2">Load Average (1m)</p>
          <p className="text-3xl font-bold">{metrics.loadAvg[0]}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <p className="text-sm text-[var(--text-muted)] mb-2">Load Average (5m)</p>
          <p className="text-3xl font-bold">{metrics.loadAvg[1]}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <p className="text-sm text-[var(--text-muted)] mb-2">Process Count</p>
          <p className="text-3xl font-bold">{processes.length}</p>
        </div>
      </div>

      {/* CPU Usage Chart */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">CPU Usage Over Time (Real-time)</h3>
          <button onClick={refreshMetrics} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={cpuHistory}>
            <defs>
              <linearGradient id="cpuGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={29} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#cpuGrad2)" strokeWidth={2} name="CPU %" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dual Axis: CPU vs Processes */}
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold mb-4">CPU vs Process Count (Dual Axis)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dualData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={29} />
              <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} label={{ value: 'CPU %', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-muted)', fontSize: 11 } }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} label={{ value: 'Processes', angle: 90, position: 'insideRight', style: { fill: 'var(--text-muted)', fontSize: 11 } }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line yAxisId="left" type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} name="CPU %" />
              <Line yAxisId="right" type="monotone" dataKey="processes" stroke="#f59e0b" strokeWidth={2} dot={false} name="Processes" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Scatter Plot: Correlation */}
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold mb-4">CPU-Process Correlation (Scatter)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="cpu" name="CPU %" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis dataKey="processes" name="Processes" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
              <Scatter data={scatterData} fill="#10b981" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top CPU Processes */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <h3 className="text-lg font-semibold mb-4">Top CPU Consuming Processes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">PID</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Name</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">CPU %</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Memory %</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Status</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Command</th>
              </tr>
            </thead>
            <tbody>
              {topCpu.map(p => (
                <tr key={p.pid} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="py-3 px-3 font-mono text-xs">{p.pid}</td>
                  <td className="py-3 px-3 font-medium">{p.name}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, p.cpu)}%` }} />
                      </div>
                      <span className="text-xs">{p.cpu}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">{p.memory}%</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === 'running' ? 'bg-emerald-500/20 text-emerald-400' :
                      p.status === 'sleeping' ? 'bg-blue-500/20 text-blue-400' :
                      p.status === 'stopped' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>{p.status}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs text-[var(--text-muted)] max-w-xs truncate">{p.command}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
