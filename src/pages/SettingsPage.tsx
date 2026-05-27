import { useStore } from '../store';
import { Settings, Save, RotateCcw, Moon, Sun, Bell, Clock, Database, Shield, Download } from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings, theme, setTheme } = useStore();

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
    <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)]">
      <h3 className="text-lg font-semibold mb-5 flex items-center gap-2"><Icon className="w-5 h-5 text-emerald-400" />{title}</h3>
      <div className="space-y-5">{children}</div>
    </div>
  );

  const Toggle = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between">
      <div><p className="font-medium text-sm">{label}</p><p className="text-xs text-[var(--text-muted)]">{desc}</p></div>
      <button onClick={() => onChange(!value)} className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-emerald-500' : 'bg-[var(--border-color)]'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );

  const Slider = ({ label, desc, value, min, max, step, unit, onChange }: { label: string; desc: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) => (
    <div>
      <div className="flex justify-between mb-2"><div><p className="font-medium text-sm">{label}</p><p className="text-xs text-[var(--text-muted)]">{desc}</p></div><span className="text-sm font-medium text-emerald-400">{value}{unit}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-[var(--border-color)] rounded-full appearance-none cursor-pointer accent-emerald-500" />
      <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1"><span>{min}{unit}</span><span>{max}{unit}</span></div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-emerald-400" />Settings</h2>
        <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium flex items-center gap-2 transition-colors text-sm">
          <Save className="w-4 h-4" /> Save All
        </button>
      </div>

      {/* Appearance */}
      <Section title="Appearance" icon={theme === 'dark' ? Moon : Sun}>
        <div>
          <p className="font-medium text-sm mb-3">Theme</p>
          <div className="flex gap-3">
            <button onClick={() => setTheme('dark')} className={`flex-1 p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border-color)]'}`}>
              <Moon className="w-6 h-6 mx-auto mb-2" /><p className="text-sm font-medium text-center">Dark</p>
            </button>
            <button onClick={() => setTheme('light')} className={`flex-1 p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border-color)]'}`}>
              <Sun className="w-6 h-6 mx-auto mb-2" /><p className="text-sm font-medium text-center">Light</p>
            </button>
          </div>
        </div>
      </Section>

      {/* Monitoring */}
      <Section title="Monitoring" icon={Clock}>
        <Slider label="Refresh Interval" desc="How often to update metrics" value={settings.refreshInterval} min={1} max={30} step={1} unit="s" onChange={v => updateSettings({ refreshInterval: v })} />
        <Slider label="CPU Alert Threshold" desc="Alert when CPU exceeds this" value={settings.cpuThreshold} min={50} max={100} step={5} unit="%" onChange={v => updateSettings({ cpuThreshold: v })} />
        <Slider label="Memory Alert Threshold" desc="Alert when memory exceeds this" value={settings.memoryThreshold} min={50} max={100} step={5} unit="%" onChange={v => updateSettings({ memoryThreshold: v })} />
        <Slider label="Storage Alert Threshold" desc="Default storage alert threshold" value={settings.storageThreshold} min={50} max={100} step={5} unit="%" onChange={v => updateSettings({ storageThreshold: v })} />
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={Bell}>
        <Toggle label="Enable Notifications" desc="Receive alerts for threshold breaches" value={settings.notificationsEnabled} onChange={v => updateSettings({ notificationsEnabled: v })} />
        <Toggle label="Toast Notifications" desc="Show in-app toast notifications" value={settings.toastNotifications} onChange={v => updateSettings({ toastNotifications: v })} />
        <Toggle label="Termux Notifications" desc="Send via termux-notification (requires Termux:API)" value={settings.termuxNotifications} onChange={v => updateSettings({ termuxNotifications: v })} />
      </Section>

      {/* Data Management */}
      <Section title="Data Management" icon={Database}>
        <Slider label="Data Retention" desc="Keep detailed metrics for this many days" value={settings.retentionDays} min={1} max={365} step={1} unit=" days" onChange={v => updateSettings({ retentionDays: v })} />
        <div className="flex gap-3">
          <button className="flex-1 px-4 py-3 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors text-sm font-medium flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Export Data (CSV)
          </button>
          <button className="flex-1 px-4 py-3 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-colors text-sm font-medium flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Export Data (JSON)
          </button>
          <button className="flex-1 px-4 py-3 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 transition-colors text-sm font-medium flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Purge Old Data
          </button>
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" icon={Shield}>
        <Toggle label="Enable Login" desc="Require login to access dashboard (admin / More@123)" value={settings.loginEnabled} onChange={v => updateSettings({ loginEnabled: v })} />
        <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
          <p className="text-sm font-medium mb-1">Default Credentials</p>
          <p className="text-xs text-[var(--text-muted)]">Username: <span className="font-mono text-emerald-400">admin</span></p>
          <p className="text-xs text-[var(--text-muted)]">Password: <span className="font-mono text-emerald-400">More@123</span></p>
          <p className="text-xs text-[var(--text-muted)] mt-2 italic">Update credentials in the project config file.</p>
        </div>
      </Section>
    </div>
  );
}
