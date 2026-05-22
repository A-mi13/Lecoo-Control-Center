import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Sidebar } from '@/components/Sidebar';
import { Titlebar } from '@/components/Titlebar';
import { DaemonOverlay } from '@/components/DaemonOverlay';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTelemetrySubscription } from '@/hooks/useTelemetrySubscription';
import Overview from '@/pages/Overview';
import Fans from '@/pages/Fans';
import Power from '@/pages/Power';
import Battery from '@/pages/Battery';
import Keyboard from '@/pages/Keyboard';
import LedRing from '@/pages/LedRing';
import Settings from '@/pages/Settings';

function GlobalSubscriptions() {
  useTelemetrySubscription();
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <HashRouter>
          <GlobalSubscriptions />
          <DaemonOverlay />
          <div className="h-screen flex flex-col bg-bg text-text">
            <Titlebar />
            <div className="flex-1 flex min-h-0">
              <Sidebar />
              <main className="flex-1 overflow-auto p-6">
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Overview />} />
                    <Route path="/fans" element={<Fans />} />
                    <Route path="/power" element={<Power />} />
                    <Route path="/battery" element={<Battery />} />
                    <Route path="/keyboard" element={<Keyboard />} />
                    <Route path="/led" element={<LedRing />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </ErrorBoundary>
              </main>
            </div>
          </div>
        </HashRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
