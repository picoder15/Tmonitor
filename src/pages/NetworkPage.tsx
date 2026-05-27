import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { generateNetworkSpeedData, formatBytes, formatSpeed, mockNetworkInterfaces, generateTimeSeriesData } from '../data/mockData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Wifi, Plus, Trash2, ArrowDown, ArrowUp, Globe, Shield, Activity } from 'lucide-react';

export default function NetworkPage() {
  const { monitoredPorts, addMonitoredPort, removeMonitoredPort, theme, metrics } = useStore();
  const [newPort, setNewPort] = useState('');
  const [newProto, setNewProto] = useState<'tcp' | 'udp'>('tcp');
  const [newDesc, setNewDesc] = useState('');
  const speedData = useMemo(() => generateNetworkSpeedData(60), []);
  const latencyData = useMemo(() => generateTimeSeriesData(60, 5, 150), []);

  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px',
    color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
  };

  const handleAddPort = () => {
    const port = parseInt(newPort);
    if (!port || port < 1 || port > 65535) return;
    addMonitoredPort({ port, protocol: newProto, description: newDesc || `Port ${port}`, active: true });
    setNewPort(''); setNewDesc('');
  };

  const portHistory = useMemo(() => {
    return monitoredPorts.map(p => ({
      name: `${p.port}`,
      uptime: p.uptime,
      downtime: 100 - p.uptime,
    }));
  }, [monitoredPorts]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Network Speed Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-2"><ArrowDown className="w-5 h-5 text-emerald-400" /><span className="text-sm text-[var(--text-muted)]">Download</span></div>
          <p className="text-2xl font-bold">{formatSpeed(2500)}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-2"><ArrowUp className="w-5 h-5 text-blue-400" /><span className="text-sm text-[var(--text-muted)]">Upload</span></div>
          <p className="text-2xl font-bold">{formatSpeed(800)}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-2"><Globe className="w-5 h-5 text-cyan-400" /><span className="text-sm text-[var(--text-muted)]">Latency</span></div>
          <p className="text-2xl font-bold">{metrics.networkLatency}ms</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-purple-400" /><span className="text-sm text-[var(--text-muted)]">Active Ports</span></div>
          <p className="text-2xl font-bold">{monitoredPorts.filter(p => p.status === 'open').length}</p>
        </div>
      </div>

      {/* Network Interfaces */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Wifi className="w-5 h-5 text-cyan-400" />Network Interfaces</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockNetworkInterfaces.map(iface => (
            <div key={iface.name} className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="font-mono font-medium">{iface.name}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">RX Total</span><span>{formatBytes(iface.rxBytes)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">TX Total</span><span>{formatBytes(iface.txBytes)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">RX Speed</span><span className="text-emerald-400">{formatSpeed(iface.rxSpeed)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--text-muted)]">TX Speed</span><span className="text-blue-400">{formatSpeed(iface.txSpeed)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Speed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold mb-4">Network Speed (Real-time)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={speedData}>
              <defs>
                <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ulGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={14} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="download" stroke="#10b981" fill="url(#dlGrad)" strokeWidth={2} name="Download (KB/s)" />
              <Area type="monotone" dataKey="upload" stroke="#3b82f6" fill="url(#ulGrad)" strokeWidth={2} name="Upload (KB/s)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
          <h3 className="text-lg font-semibold mb-4">Network Latency History</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={latencyData}>
              <defs>
                <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={14} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="value" stroke="#f59e0b" fill="url(#latGrad)" strokeWidth={2} name="Latency (ms)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Port Monitoring */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <h3 className="text-lg font-semibold mb-4">User-Monitored Ports</h3>
        <div className="flex flex-wrap gap-3 mb-6">
          <input value={newPort} onChange={e => setNewPort(e.target.value)} placeholder="Port (e.g. 8080)" type="number"
            className="w-36 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors" />
          <select value={newProto} onChange={e => setNewProto(e.target.value as 'tcp' | 'udp')}
            className="px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors">
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
          </select>
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description"
            className="flex-1 min-w-[150px] px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors" />
          <button onClick={handleAddPort} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Add Port
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Port</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Protocol</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Description</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Status</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Uptime</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {monitoredPorts.map(p => (
                <tr key={p.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="py-3 px-3 font-mono font-medium">{p.port}</td>
                  <td className="py-3 px-3 uppercase text-xs">{p.protocol}</td>
                  <td className="py-3 px-3">{p.description}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      p.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' :
                      p.status === 'closed' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>● {p.status}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.uptime}%` }} />
                      </div>
                      <span className="text-xs">{p.uptime}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <button onClick={() => removeMonitoredPort(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Port Availability Chart */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <h3 className="text-lg font-semibold mb-4">Port Availability</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={portHistory} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} width={60} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="uptime" stackId="a" fill="#10b981" name="Uptime" />
            <Bar dataKey="downtime" stackId="a" fill="#ef4444" fillOpacity={0.3} name="Downtime" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
