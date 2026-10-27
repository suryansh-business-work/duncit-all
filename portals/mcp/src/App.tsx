import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage } from '@duncit/shell';
import McpAppShell from './components/McpAppShell';
import DashboardPage from './pages/dashboard/DashboardPage';
import ActivityPage from './pages/activity/ActivityPage';
import ToolsPage from './pages/tools/ToolsPage';
import ConnectPage from './pages/connect/ConnectPage';
import ConnectionsPage from './pages/connections/ConnectionsPage';
import SettingsPage from './pages/settings/SettingsPage';
import GuideRoute from './pages/guide/GuideRoute';
import { runtime } from './runtime';

const { LoginPage, session } = runtime;
const authed = createAuthed({ getToken: session.getToken, wrap: (el) => <McpAppShell>{el}</McpAppShell> });

/**
 * The MCP console's screens. Every one but the Guide sits behind the login
 * gate and its own page error boundary (createAuthed). /connect is where the
 * server's OAuth /authorize sends a person: the login gate keeps the
 * `?request=` in its `?redirect=`, so they land back on the consent screen.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/activity" element={authed(<ActivityPage />)} />
      <Route path="/tools" element={authed(<ToolsPage />)} />
      <Route path="/connect" element={authed(<ConnectPage />)} />
      <Route path="/connections" element={authed(<ConnectionsPage />)} />
      <Route path="/settings" element={authed(<SettingsPage />)} />
      <Route path="/guide" element={<GuideRoute authed={authed} getToken={session.getToken} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
