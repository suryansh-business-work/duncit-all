import { Navigate, Route, Routes } from 'react-router-dom';
import { createAuthed, ProfilePage } from '@duncit/shell';
import { NotifyHost } from '@duncit/dialogs';
import LoginPage from './pages/LoginPage';
import EnvironmentPage from './pages/environment';
import PortalModesPage from './pages/portal-modes';
import FeatureFlagsPage from './pages/feature-flags-page/FeatureFlagsPage';
import AuthenticationPage from './pages/AuthenticationPage';
import EmailTemplatesPage from './pages/email-templates-page/EmailTemplatesPage';
import TelemetryDashboardPage from './pages/telemetry-dashboard';
import BugsPage from './pages/bugs-page';
import TelemetryLogsSettingsPage from './pages/telemetry-logs-settings';
import ServerInfoPage from './pages/server/ServerInfoPage';
import DockerPage from './pages/server/DockerPage';
import TerminalPage from './pages/server/TerminalPage';
import SlackSettingsPage from './pages/slack/SlackSettingsPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={authed(<EnvironmentPage />)} />
        <Route path="/portal-modes" element={authed(<PortalModesPage />)} />
        <Route path="/feature-flags" element={authed(<FeatureFlagsPage />)} />
        <Route path="/authentication" element={authed(<AuthenticationPage />)} />
        <Route path="/email-templates" element={authed(<EmailTemplatesPage />)} />
        <Route path="/telemetry" element={authed(<TelemetryDashboardPage />)} />
        <Route path="/bugs" element={authed(<BugsPage />)} />
        <Route path="/telemetry-logs-settings" element={authed(<TelemetryLogsSettingsPage />)} />
        <Route path="/server" element={<Navigate to="/server/info" replace />} />
        <Route path="/server/info" element={authed(<ServerInfoPage />)} />
        <Route path="/server/docker" element={authed(<DockerPage />)} />
        <Route path="/server/terminal" element={authed(<TerminalPage />)} />
        <Route path="/slack" element={authed(<SlackSettingsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotifyHost />
    </>
  );
}
