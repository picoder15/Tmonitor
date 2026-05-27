import { useState } from 'react';
import { useStore } from '../store';
import { timeAgo } from '../data/mockData';
import { Bell, Check, Trash2, Filter, AlertTriangle, Info, XCircle, CheckCircle, Search } from 'lucide-react';

export default function AlertsPage() {
  const { alerts, acknowledgeAlert, deleteAlert } = useStore();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterAck, setFilterAck] = useState<string>('all');
  const [search, setSearch] = useState('');

  const types = ['all', ...new Set(alerts.map(a => a.type))];
  const severities = ['all', 'info', 'warning', 'critical'];

  const filtered = alerts.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (filterAck === 'unack' && a.acknowledged) return false;
    if (filterAck === 'ack' && !a.acknowledged) return false;
    if (search && !a.message.toLowerCase().includes(search.toLowerCase()) && !a.details.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sevIcon = (s: string) => {
    switch (s) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const typeColor = (t: string) => {
    const colors: Record<string, string> = {
      storage: 'bg-blue-500/20 text-blue-400',
      cpu_spike: 'bg-orange-500/20 text-orange-400',
      port_down: 'bg-red-500/20 text-red-400',
      script_failure: 'bg-purple-500/20 text-purple-400',
      memory: 'bg-violet-500/20 text-violet-400',
      network: 'bg-cyan-500/20 text-cyan-400',
      battery: 'bg-green-500/20 text-green-400',
    };
    return colors[t] || 'bg-gray-500/20 text-gray-400';
  };

  const unackCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <p className="text-sm text-[var(--text-muted)] mb-1">Total Alerts</p>
          <p className="text-3xl font-bold">{alerts.length}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <p className="text-sm text-[var(--text-muted)] mb-1">Unacknowledged</p>
          <p className="text-3xl font-bold text-red-400">{unackCount}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <p className="text-sm text-[var(--text-muted)] mb-1">Critical</p>
          <p className="text-3xl font-bold text-red-400">{alerts.filter(a => a.severity === 'critical').length}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
          <p className="text-sm text-[var(--text-muted)] mb-1">Acknowledged</p>
          <p className="text-3xl font-bold text-emerald-400">{alerts.filter(a => a.acknowledged).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-5 h-5 text-[var(--text-muted)]" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-emerald-500 transition-colors">
            {types.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : t.replace('_', ' ')}</option>)}
          </select>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-emerald-500 transition-colors">
            {severities.map(s => <option key={s} value={s}>{s === 'all' ? 'All Severities' : s}</option>)}
          </select>
          <select value={filterAck} onChange={e => setFilterAck(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-emerald-500 transition-colors">
            <option value="all">All Status</option>
            <option value="unack">Unacknowledged</option>
            <option value="ack">Acknowledged</option>
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alerts..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-[var(--bg-card)] rounded-2xl p-12 border border-[var(--border-color)] text-center">
            <Bell className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
            <p className="text-lg font-medium text-[var(--text-muted)]">No alerts match your filters</p>
          </div>
        ) : (
          filtered.map(alert => (
            <div key={alert.id} className={`bg-[var(--bg-card)] rounded-2xl p-5 border transition-all hover:shadow-lg ${
              !alert.acknowledged ? 'border-l-4' : 'border'
            } ${
              !alert.acknowledged && alert.severity === 'critical' ? 'border-l-red-500 border-[var(--border-color)]' :
              !alert.acknowledged && alert.severity === 'warning' ? 'border-l-yellow-500 border-[var(--border-color)]' :
              !alert.acknowledged ? 'border-l-blue-500 border-[var(--border-color)]' :
              'border-[var(--border-color)]'
            }`}>
              <div className="flex items-start gap-4">
                <div className="mt-0.5">{sevIcon(alert.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-medium">{alert.message}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${typeColor(alert.type)}`}>{alert.type.replace('_', ' ')}</span>
                    {alert.acknowledged && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Acknowledged
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">{alert.details}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{timeAgo(alert.timestamp)} · {new Date(alert.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!alert.acknowledged && (
                    <button onClick={() => acknowledgeAlert(alert.id)} className="p-2 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors" title="Acknowledge">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteAlert(alert.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
