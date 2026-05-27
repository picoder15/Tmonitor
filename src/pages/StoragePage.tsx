import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { formatBytes, generateStorageHistory } from '../data/mockData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { HardDrive, Plus, Trash2, AlertTriangle } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function StoragePage() {
  const { monitoredPaths, addMonitoredPath, removeMonitoredPath, theme } = useStore();
  const [newPath, setNewPath] = useState('');
  const [newThreshold, setNewThreshold] = useState(80);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const storageHistory = useMemo(() => generateStorageHistory(48), []);

  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px',
    color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
  };

  const pieData = monitoredPaths.map(p => ({
    name: p.path.split('/').pop() || p.path,
    value: p.usedBytes,
  }));

  const handleAdd = () => {
    if (!newPath.trim()) return;
    addMonitoredPath({ path: newPath.trim(), threshold: newThreshold });
    setNewPath('');
    setNewThreshold(80);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Add Path Form */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><HardDrive className="w-5 h-5 text-blue-400" />Monitor New Path</h3>
        <div className="flex flex-wrap gap-3">
          <input
            value={newPath}
            onChange={e => setNewPath(e.target.value)}
            placeholder="/path/to/monitor"
            className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--text-muted)]">Threshold:</label>
            <input
              type="number"
              value={newThreshold}
              onChange={e => setNewThreshold(Number(e.target.value))}
              min={1} max={100}
              className="w-20 px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <span className="text-sm text-[var(--text-muted)]">%</span>
          </div>
          <button onClick={handleAdd} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Add Path
          </button>
        </div>
      </div>

      {/* Path Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {monitoredPaths.map(p => {
          const pct = Math.round((p.usedBytes / p.totalBytes) * 100);
          const overThreshold = pct >= p.threshold;
          return (
            <div key={p.id} className={`bg-[var(--bg-card)] rounded-2xl p-5 border ${overThreshold ? 'border-red-500/50' : 'border-[var(--border-color)]'} hover:shadow-lg transition-all cursor-pointer`}
              onClick={() => setSelectedPath(selectedPath === p.id ? null : p.id)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-sm font-medium">{p.path}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Threshold: {p.threshold}%</p>
                </div>
                <div className="flex items-center gap-2">
                  {overThreshold && <AlertTriangle className="w-4 h-4 text-red-400" />}
                  <button onClick={(e) => { e.stopPropagation(); removeMonitoredPath(p.id); }} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>{formatBytes(p.usedBytes)} / {formatBytes(p.totalBytes)}</span>
                  <span className={`font-medium ${overThreshold ? 'text-red-400' : 'text-emerald-400'}`}>{pct}%</span>
                </div>
                <div className="w-full h-3 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'
                  }`} style={{ width: `${pct}%` }} />
                </div>
              </div>
              {selectedPath === p.id && (
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <p className="text-sm font-medium mb-2">Usage History</p>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={storageHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} interval={11} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="used" stroke="#3b82f6" strokeWidth={2} dot={false} name="Usage %" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-center">
                    <div><p className="text-xs text-[var(--text-muted)]">Growth Rate</p><p className="text-sm font-medium">+1.2 GB/week</p></div>
                    <div><p className="text-xs text-[var(--text-muted)]">Avg Usage</p><p className="text-sm font-medium">62%</p></div>
                    <div><p className="text-xs text-[var(--text-muted)]">Peak Usage</p><p className="text-sm font-medium">87%</p></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold mb-4">Storage Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }: Record<string, any>) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatBytes(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold mb-4">Usage Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monitoredPaths.map(p => ({
              name: p.path.split('/').pop(),
              usage: Math.round((p.usedBytes / p.totalBytes) * 100),
              threshold: p.threshold,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="usage" fill="#3b82f6" name="Usage %" radius={[6, 6, 0, 0]} />
              <Bar dataKey="threshold" fill="#ef4444" fillOpacity={0.3} name="Threshold %" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
