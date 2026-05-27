import { useState } from 'react';
import { useStore } from '../store';
import { timeAgo } from '../data/mockData';
import { Terminal, Plus, Trash2, Play, Clock, CheckCircle, XCircle, Loader, Tag, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';

export default function ScriptsPage() {
  const { scripts, addScript, removeScript, runScript, cronJobs, addCronJob, removeCronJob, toggleCronJob, demoMode } = useStore();
  const [tab, setTab] = useState<'scripts' | 'cron'>('scripts');
  const [showAddScript, setShowAddScript] = useState(false);
  const [showAddCron, setShowAddCron] = useState(false);
  const [sName, setSName] = useState(''); const [sPath, setSPath] = useState('');
  const [sDesc, setSDesc] = useState(''); const [sTags, setSTags] = useState('');
  const [cSchedule, setCSchedule] = useState(''); const [cCommand, setCCommand] = useState('');
  const [cDesc, setCDesc] = useState('');

  const statusIcon = (s: string) => {
    switch (s) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'failure': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running': return <Loader className="w-4 h-4 text-blue-400 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'success': return 'bg-emerald-500/20 text-emerald-400';
      case 'failure': return 'bg-red-500/20 text-red-400';
      case 'running': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleAddScript = () => {
    if (!sName.trim() || !sPath.trim()) return;
    addScript({ name: sName, path: sPath, description: sDesc, tags: sTags.split(',').map(t => t.trim()).filter(Boolean), lastRunStatus: 'never' });
    setSName(''); setSPath(''); setSDesc(''); setSTags(''); setShowAddScript(false);
  };

  const handleAddCron = () => {
    if (!cSchedule.trim() || !cCommand.trim()) return;
    addCronJob({ schedule: cSchedule, command: cCommand, description: cDesc, active: true });
    setCSchedule(''); setCCommand(''); setCDesc(''); setShowAddCron(false);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Tab Switcher */}
      <div className="flex gap-2 bg-[var(--bg-card)] rounded-2xl p-1.5 border border-[var(--border-color)] w-fit">
        <button onClick={() => setTab('scripts')} className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'scripts' ? 'bg-emerald-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
          <Terminal className="w-4 h-4 inline mr-2" />Scripts
        </button>
        <button onClick={() => setTab('cron')} className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'cron' ? 'bg-emerald-500 text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
          <Calendar className="w-4 h-4 inline mr-2" />Cron Jobs
        </button>
      </div>

      {tab === 'scripts' && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Script Repository</h3>
            <button onClick={() => setShowAddScript(!showAddScript)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors text-sm">
              <Plus className="w-4 h-4" /> Add Script
            </button>
          </div>

          {showAddScript && (
            <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-emerald-500/30">
              <h4 className="font-medium mb-4">New Script</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input value={sName} onChange={e => setSName(e.target.value)} placeholder="Script name"
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors" />
                <input value={sPath} onChange={e => setSPath(e.target.value)} placeholder="/path/to/script.sh"
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors font-mono" />
                <input value={sDesc} onChange={e => setSDesc(e.target.value)} placeholder="Description"
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors" />
                <input value={sTags} onChange={e => setSTags(e.target.value)} placeholder="Tags (comma separated)"
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddScript} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-sm transition-colors">Save</button>
                <button onClick={() => setShowAddScript(false)} className="px-5 py-2 bg-[var(--bg-hover)] hover:bg-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-medium text-sm transition-colors">Cancel</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scripts.map(s => (
              <div key={s.id} className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border-color)] hover:border-[var(--border-hover)] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {statusIcon(s.lastRunStatus)}
                    <h4 className="font-semibold">{s.name}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { if (!demoMode || confirm('Demo: Script execution simulated')) runScript(s.id); }}
                      className="p-2 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors" title="Run">
                      <Play className="w-4 h-4" />
                    </button>
                    <button onClick={() => removeScript(s.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors" title="Remove">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-2">{s.description}</p>
                <p className="font-mono text-xs text-[var(--text-muted)] mb-3 bg-[var(--bg-primary)] px-3 py-1.5 rounded-lg">{s.path}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {s.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-[var(--bg-primary)] text-[var(--text-muted)] flex items-center gap-1">
                        <Tag className="w-3 h-3" />{t}
                      </span>
                    ))}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(s.lastRunStatus)}`}>
                    {s.lastRunStatus} {s.lastRunTime ? `(${timeAgo(s.lastRunTime)})` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'cron' && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Cron Jobs</h3>
            <button onClick={() => setShowAddCron(!showAddCron)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors text-sm">
              <Plus className="w-4 h-4" /> Add Cron Job
            </button>
          </div>

          {showAddCron && (
            <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-emerald-500/30">
              <h4 className="font-medium mb-4">New Cron Job</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input value={cSchedule} onChange={e => setCSchedule(e.target.value)} placeholder="*/5 * * * *"
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors font-mono" />
                <input value={cCommand} onChange={e => setCCommand(e.target.value)} placeholder="/path/to/command"
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors font-mono" />
                <input value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder="Description"
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddCron} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-sm transition-colors">Save</button>
                <button onClick={() => setShowAddCron(false)} className="px-5 py-2 bg-[var(--bg-hover)] hover:bg-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-medium text-sm transition-colors">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Active</th>
                  <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Schedule</th>
                  <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Command</th>
                  <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Description</th>
                  <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Last Run</th>
                  <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cronJobs.map(j => (
                  <tr key={j.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="py-3 px-4">
                      <button onClick={() => toggleCronJob(j.id)} className="transition-colors">
                        {j.active ? <ToggleRight className="w-6 h-6 text-emerald-400" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs bg-[var(--bg-primary)] rounded">{j.schedule}</td>
                    <td className="py-3 px-4 font-mono text-xs max-w-[200px] truncate">{j.command}</td>
                    <td className="py-3 px-4 text-[var(--text-muted)]">{j.description}</td>
                    <td className="py-3 px-4 text-xs text-[var(--text-muted)]">{j.lastRun ? timeAgo(j.lastRun) : 'Never'}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => removeCronJob(j.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
