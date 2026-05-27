import { useState } from 'react';
import { useStore } from '../store';
import {
  HelpCircle, Zap, Book, MessageCircle, ChevronDown, ChevronRight,
  LayoutDashboard, Cpu, HardDrive, Network, ListTree, Terminal, FileText, Bell, Settings, Monitor
} from 'lucide-react';

const tourSteps = [
  { title: 'Dashboard Overview', desc: 'The main dashboard shows system metrics at a glance: CPU, memory, storage, network, battery, and temperature. All data refreshes in real-time.', icon: LayoutDashboard },
  { title: 'CPU & Process Monitoring', desc: 'View detailed CPU usage history, load averages, and process-CPU correlation. Scatter plots show the relationship between process count and CPU load.', icon: Cpu },
  { title: 'Storage Monitoring', desc: 'Add custom paths to monitor disk usage. Set thresholds for alerts. View usage history, growth rates, and distribution charts.', icon: HardDrive },
  { title: 'Network & Ports', desc: 'Monitor real-time network speeds, latency, and interface statistics. Add ports to monitor and track their availability over time.', icon: Network },
  { title: 'Process Manager', desc: 'View all running processes with CPU/memory usage. Kill, suspend, or resume processes directly from the dashboard.', icon: ListTree },
  { title: 'Scripts & Cron Jobs', desc: 'Manage your script repository and cron jobs. Run scripts, view execution history, and toggle cron job status.', icon: Terminal },
  { title: 'File Monitor', desc: 'Watch files for changes with real-time event tracking. View file contents, search logs, and track modification history.', icon: FileText },
  { title: 'Alert History', desc: 'Centralized alert logging with filters by type, severity, and status. Acknowledge alerts and track resolution.', icon: Bell },
  { title: 'Settings', desc: 'Configure refresh intervals, alert thresholds, notifications, data retention, and security options.', icon: Settings },
];

const faqs = [
  { q: 'How do I install required dependencies?', a: 'Run the following in Termux:\npkg install python nmap inotify-tools\npip install flask\nSome features work without additional packages.' },
  { q: 'What is Demo Mode?', a: 'Demo Mode populates the dashboard with realistic mock data so you can explore all features without connecting to a real system. Toggle it from the sidebar or Help page.' },
  { q: 'How do I change the login credentials?', a: 'Update the config file in the project root. Default credentials are admin / More@123. Login can be disabled from Settings.' },
  { q: 'Why is CPU data not updating?', a: 'Ensure the data collector is running. Check that /proc/stat is accessible. The refresh interval can be adjusted in Settings.' },
  { q: 'Can I monitor remote systems?', a: 'Currently, the dashboard monitors the local Termux environment. Remote monitoring can be achieved via SSH tunneling or by exposing the API (with caution).' },
  { q: 'How do I export my data?', a: 'Go to Settings > Data Management and click Export Data in CSV or JSON format.' },
  { q: 'What ports can I monitor?', a: 'You can add any TCP/UDP port to monitor. The system uses nc (netcat) to check port status. For advanced scanning, install nmap via pkg install nmap.' },
  { q: 'How do alerts work?', a: 'Alerts are triggered when metrics exceed configured thresholds. They appear in the notification bell and Alert History page. You can acknowledge and add notes to alerts.' },
];

export default function HelpPage() {
  const { demoMode, toggleDemoMode } = useStore();
  const [tourStep, setTourStep] = useState(0);
  const [showTour, setShowTour] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Demo Mode Toggle */}
      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl p-6 border border-amber-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-amber-400" />
            <div>
              <h3 className="text-lg font-semibold">Demo Mode</h3>
              <p className="text-sm text-[var(--text-muted)]">Explore the dashboard with realistic mock data. Interactive actions are simulated.</p>
            </div>
          </div>
          <button onClick={toggleDemoMode} className={`px-5 py-2.5 rounded-xl font-medium transition-all text-sm ${
            demoMode ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)]'
          }`}>
            {demoMode ? '✓ Demo Active' : 'Enable Demo'}
          </button>
        </div>
      </div>

      {/* Interactive Tour */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Monitor className="w-5 h-5 text-cyan-400" />Interactive Tour</h3>
          <button onClick={() => setShowTour(!showTour)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-sm transition-colors">
            {showTour ? 'Hide Tour' : 'Start Tour'}
          </button>
        </div>
        {showTour && (
          <div>
            <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
              {tourSteps.map((_, i) => (
                <button key={i} onClick={() => setTourStep(i)} className={`w-8 h-2 rounded-full transition-all ${i === tourStep ? 'bg-emerald-500 w-12' : 'bg-[var(--border-color)] hover:bg-[var(--text-muted)]'}`} />
              ))}
            </div>
            <div className="bg-[var(--bg-primary)] rounded-xl p-6 border border-[var(--border-color)]">
              <div className="flex items-start gap-4">
                {(() => { const Icon = tourSteps[tourStep].icon; return <div className="p-3 rounded-xl bg-emerald-500/20"><Icon className="w-8 h-8 text-emerald-400" /></div>; })()}
                <div>
                  <h4 className="text-lg font-semibold mb-2">Step {tourStep + 1}: {tourSteps[tourStep].title}</h4>
                  <p className="text-[var(--text-muted)] leading-relaxed">{tourSteps[tourStep].desc}</p>
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setTourStep(Math.max(0, tourStep - 1))} disabled={tourStep === 0}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-sm font-medium hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  ← Previous
                </button>
                <span className="text-sm text-[var(--text-muted)] self-center">{tourStep + 1} / {tourSteps.length}</span>
                <button onClick={() => setTourStep(Math.min(tourSteps.length - 1, tourStep + 1))} disabled={tourStep === tourSteps.length - 1}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature Guide */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Book className="w-5 h-5 text-purple-400" />Feature Guide</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tourSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--border-hover)] transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-medium text-sm">{step.title}</h4>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-amber-400" />Frequently Asked Questions</h3>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-[var(--border-color)] rounded-xl overflow-hidden">
              <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg-hover)] transition-colors">
                <span className="font-medium text-sm">{faq.q}</span>
                {expandedFaq === i ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
              </button>
              {expandedFaq === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-line">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-cyan-400" />Quick Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="https://wiki.termux.com" target="_blank" rel="noopener noreferrer" className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-emerald-500/50 transition-all text-center">
            <p className="font-medium text-sm">Termux Wiki</p>
            <p className="text-xs text-[var(--text-muted)]">Official documentation</p>
          </a>
          <a href="https://github.com/termux" target="_blank" rel="noopener noreferrer" className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-emerald-500/50 transition-all text-center">
            <p className="font-medium text-sm">GitHub Repository</p>
            <p className="text-xs text-[var(--text-muted)]">Source code & issues</p>
          </a>
          <a href="https://termux.dev" target="_blank" rel="noopener noreferrer" className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-emerald-500/50 transition-all text-center">
            <p className="font-medium text-sm">Termux:API</p>
            <p className="text-xs text-[var(--text-muted)]">API add-on docs</p>
          </a>
        </div>
      </div>
    </div>
  );
}
