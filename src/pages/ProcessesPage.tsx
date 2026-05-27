import { useState } from 'react';
import { useStore } from '../store';
import { ListTree, Search, Square, Play, XCircle, AlertTriangle } from 'lucide-react';

export default function ProcessesPage() {
  const { processes, killProcess, suspendProcess, resumeProcess, demoMode } = useStore();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'cpu' | 'memory' | 'pid' | 'name'>('cpu');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [confirmKill, setConfirmKill] = useState<number | null>(null);

  const filtered = processes
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.command.toLowerCase().includes(search.toLowerCase()) || String(p.pid).includes(search))
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'cpu') return (a.cpu - b.cpu) * mul;
      if (sortBy === 'memory') return (a.memory - b.memory) * mul;
      if (sortBy === 'pid') return (a.pid - b.pid) * mul;
      return a.name.localeCompare(b.name) * mul;
    });

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIndicator = ({ col }: { col: typeof sortBy }) => (
    sortBy === col ? <span className="ml-1 text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span> : null
  );

  const statusColor = (s: string) => {
    switch (s) {
      case 'running': return 'bg-emerald-500/20 text-emerald-400';
      case 'sleeping': return 'bg-blue-500/20 text-blue-400';
      case 'stopped': return 'bg-yellow-500/20 text-yellow-400';
      case 'zombie': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><ListTree className="w-5 h-5 text-cyan-400" />Process Manager</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search processes..."
                className="pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors text-sm w-64" />
            </div>
            <span className="text-sm text-[var(--text-muted)]">{filtered.length} processes</span>
          </div>
        </div>

        {demoMode && (
          <div className="mb-4 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Demo Mode: Process actions are simulated and don't affect real system processes.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('pid')}>PID<SortIndicator col="pid" /></th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('name')}>Name<SortIndicator col="name" /></th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('cpu')}>CPU %<SortIndicator col="cpu" /></th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium cursor-pointer hover:text-[var(--text-primary)]" onClick={() => handleSort('memory')}>Memory %<SortIndicator col="memory" /></th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Status</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">User</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Started</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Command</th>
                <th className="text-left py-3 px-3 text-[var(--text-muted)] font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.pid} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="py-3 px-3 font-mono text-xs">{p.pid}</td>
                  <td className="py-3 px-3 font-medium">{p.name}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${p.cpu > 50 ? 'bg-red-500' : p.cpu > 20 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, p.cpu)}%` }} />
                      </div>
                      <span className="text-xs w-12">{p.cpu}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, p.memory)}%` }} />
                      </div>
                      <span className="text-xs w-12">{p.memory}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="py-3 px-3 text-xs text-[var(--text-muted)]">{p.user}</td>
                  <td className="py-3 px-3 text-xs text-[var(--text-muted)]">{p.startTime}</td>
                  <td className="py-3 px-3 font-mono text-xs text-[var(--text-muted)] max-w-[200px] truncate">{p.command}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      {p.status === 'stopped' ? (
                        <button onClick={() => resumeProcess(p.pid)} className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors" title="Resume (SIGCONT)">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => suspendProcess(p.pid)} className="p-1.5 rounded-lg hover:bg-yellow-500/20 text-yellow-400 transition-colors" title="Suspend (SIGSTOP)">
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {confirmKill === p.pid ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { killProcess(p.pid); setConfirmKill(null); }} className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors">
                            Confirm
                          </button>
                          <button onClick={() => setConfirmKill(null)} className="px-2 py-1 rounded-lg bg-[var(--bg-hover)] text-[var(--text-muted)] text-xs hover:bg-[var(--border-color)] transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmKill(p.pid)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors" title="Kill (SIGTERM)">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
