import { useEffect } from 'react';
import { useStore } from './store';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CpuPage from './pages/CpuPage';
import StoragePage from './pages/StoragePage';
import NetworkPage from './pages/NetworkPage';
import ProcessesPage from './pages/ProcessesPage';
import ScriptsPage from './pages/ScriptsPage';
import FilesPage from './pages/FilesPage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';

function PageRouter() {
  const currentPage = useStore(s => s.currentPage);

  switch (currentPage) {
    case 'dashboard': return <Dashboard />;
    case 'cpu': return <CpuPage />;
    case 'storage': return <StoragePage />;
    case 'network': return <NetworkPage />;
    case 'processes': return <ProcessesPage />;
    case 'scripts': return <ScriptsPage />;
    case 'files': return <FilesPage />;
    case 'alerts': return <AlertsPage />;
    case 'settings': return <SettingsPage />;
    case 'help': return <HelpPage />;
    default: return <Dashboard />;
  }
}

export default function App() {
  const { isAuthenticated, settings, theme, startPolling, stopPolling, fetchAllData, demoMode } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Start polling when app mounts
  useEffect(() => {
    if (!demoMode) {
      fetchAllData();
    }
    startPolling();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  if (settings.loginEnabled && !isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <div className="animate-fade-in">
        <PageRouter />
      </div>
    </Layout>
  );
}
