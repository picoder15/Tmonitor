import { useState } from 'react';
import { useStore } from '../store';
import { mockFileEvents, formatBytes, timeAgo } from '../data/mockData';
import { FileText, Plus, Trash2, Eye, Search, Clock, Edit, FilePlus, FileX } from 'lucide-react';

const sampleLogLines = [
  '[2024-01-15 14:32:01] INFO: Health check completed successfully',
  '[2024-01-15 14:32:00] DEBUG: Checking CPU metrics...',
  '[2024-01-15 14:31:59] INFO: Request GET /api/metrics 200 OK (12ms)',
  '[2024-01-15 14:31:58] WARN: Memory usage approaching threshold (78%)',
  '[2024-01-15 14:31:55] INFO: Request POST /api/data 201 Created (45ms)',
  '[2024-01-15 14:31:50] ERROR: Connection to database timed out',
  '[2024-01-15 14:31:48] INFO: Retrying database connection...',
  '[2024-01-15 14:31:47] INFO: Database connection established',
  '[2024-01-15 14:31:45] DEBUG: Processing batch of 150 records',
  '[2024-01-15 14:31:40] INFO: Batch processing completed in 3.2s',
  '[2024-01-15 14:31:35] INFO: Request GET /api/health 200 OK (2ms)',
  '[2024-01-15 14:31:30] WARN: Disk I/O latency above normal (15ms)',
];

export default function FilesPage() {
  const { monitoredFiles, addMonitoredFile, removeMonitoredFile } = useStore();
  const [newPath, setNewPath] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [viewFile, setViewFile] = useState<string | null>(null);
  const [searchLog, setSearchLog] = useState('');

  const handleAdd = () => {
    if (!newPath.trim()) return;
    addMonitoredFile({ path: newPath.trim(), description: newDesc || newPath, active: true, lastModified: Date.now(), size: Math.round(Math.random() * 5242880) });
    setNewPath(''); setNewDesc('');
  };

  const filteredLogs = sampleLogLines.filter(l => l.toLowerCase().includes(searchLog.toLowerCase()));
  const eventIcon = (t: string) => {
    switch (t) {
      case 'modified': return <Edit className="w-3.5 h-3.5 text-blue-400" />;
      case 'created': return <FilePlus className="w-3.5 h-3.5 text-emerald-400" />;
      case 'deleted': return <FileX className="w-3.5 h-3.5 text-red-400" />;
      default: return <FileText className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Add File */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-purple-400" />Monitor New File</h3>
        <div className="flex flex-wrap gap-3">
          <input value={newPath} onChange={e => setNewPath(e.target.value)} placeholder="/path/to/file.log"
            className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors font-mono" />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description"
            className="w-48 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors" />
          <button onClick={handleAdd} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" /> Add File
          </button>
        </div>
      </div>

      {/* Monitored Files */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {monitoredFiles.map(f => (
          <div key={f.id} className="bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border-color)] hover:border-[var(--border-hover)] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono text-sm font-medium">{f.path}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{f.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${f.active ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                <button onClick={() => setViewFile(viewFile === f.id ? null : f.id)} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                <button onClick={() => removeMonitoredFile(f.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-[var(--text-muted)]">
              <span>Size: {f.size ? formatBytes(f.size) : 'N/A'}</span>
              <span>Modified: {f.lastModified ? timeAgo(f.lastModified) : 'N/A'}</span>
            </div>
            {viewFile === f.id && (
              <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-[var(--text-muted)]" />
                  <input value={searchLog} onChange={e => setSearchLog(e.target.value)} placeholder="Search log..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 transition-colors text-xs" />
                </div>
                <div className="bg-[var(--bg-primary)] rounded-xl p-3 max-h-60 overflow-y-auto font-mono text-xs space-y-1">
                  {filteredLogs.map((line, i) => (
                    <div key={i} className={`py-0.5 ${
                      line.includes('ERROR') ? 'text-red-400' :
                      line.includes('WARN') ? 'text-yellow-400' :
                      line.includes('DEBUG') ? 'text-gray-400' :
                      'text-[var(--text-primary)]'
                    }`}>{line}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* File Events Timeline */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-400" />Recent File Events</h3>
        <div className="space-y-3">
          {mockFileEvents.map(e => (
            <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors">
              <div className="mt-1">{eventIcon(e.eventType)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-medium">{e.path}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    e.eventType === 'modified' ? 'bg-blue-500/20 text-blue-400' :
                    e.eventType === 'created' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>{e.eventType}</span>
                  <span className="text-xs text-[var(--text-muted)]">{timeAgo(e.timestamp)}</span>
                </div>
                {e.snippet && (
                  <p className="font-mono text-xs text-[var(--text-muted)] bg-[var(--bg-primary)] px-3 py-1.5 rounded-lg truncate">{e.snippet}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
