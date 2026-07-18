import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { OfflineIndicator } from './components/OfflineIndicator';
import { HomePage } from './pages/HomePage';
import { WelcomePage } from './pages/WelcomePage';

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <OfflineIndicator />
      <header className="border-b border-neutral-800 px-4 py-3">
        <h1 className="text-lg font-bold text-purple-400">LIFEY</h1>
      </header>
      <main>{children}</main>
      <PwaInstallPrompt />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AppShell>
              <HomePage />
            </AppShell>
          }
        />
        <Route
          path="/login"
          element={<WelcomePage />}
        />
        <Route
          path="*"
          element={
            <AppShell>
              <div>404 — Page Not Found</div>
            </AppShell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
