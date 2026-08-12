import { Navigate, Route, Routes } from 'react-router-dom';
import { createAuthed, ProfilePage } from '@duncit/shell';
import { NotifyHost } from '@duncit/dialogs';
import LoginPage from './pages/LoginPage';
import EnvironmentPage from './pages/environment';
import PortalModesPage from './pages/portal-modes';
import FeatureFlagsPage from './pages/feature-flags-page/FeatureFlagsPage';
import AuthenticationPage from './pages/AuthenticationPage';
import EmailTemplatesPage from './pages/email-templates-page/EmailTemplatesPage';
import EmailFragmentsPage from './pages/email-fragments-page';
import EmailLogsPage from './pages/email-logs-page';
import EmailsDashboardPage from './pages/emails-dashboard';
import PackagesDocsPage from './pages/packages-docs';
import TelemetryDashboardPage from './pages/telemetry-dashboard';
import BugsPage from './pages/bugs-page';
import TelemetryLogsSettingsPage from './pages/telemetry-logs-settings';
import ServerInfoPage from './pages/server/ServerInfoPage';
import DockerPage from './pages/server/DockerPage';
import TerminalPage from './pages/server/TerminalPage';
import DataClonePage from './pages/data-clone';
import SlackSettingsPage from './pages/slack/SlackSettingsPage';
import AppBuildsPage from './pages/app-builds';
import AppBuildSettingsPage from './pages/app-builds/AppBuildSettingsPage';
import MailAutomationPage from './pages/mail-automation';
import AisensyPage from './pages/aisensy';
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
        <Route path="/emails" element={<Navigate to="/emails/dashboard" replace />} />
        <Route path="/emails/dashboard" element={authed(<EmailsDashboardPage />)} />
        <Route path="/emails/templates" element={authed(<EmailTemplatesPage />)} />
        <Route path="/emails/fragments" element={authed(<EmailFragmentsPage />)} />
        <Route path="/emails/logs" element={authed(<EmailLogsPage />)} />
        {/* Connecting a mailbox only. What it replies with lives in Support. */}
        <Route path="/mail-automation" element={authed(<MailAutomationPage />)} />
        <Route path="/package-docs" element={authed(<PackagesDocsPage />)} />
        {/* The old path, kept working for bookmarks. */}
        <Route path="/email-templates" element={<Navigate to="/emails/templates" replace />} />
        <Route path="/emails/docs" element={<Navigate to="/package-docs" replace />} />
        <Route path="/telemetry" element={<Navigate to="/telemetry/dashboard" replace />} />
        <Route path="/telemetry/dashboard" element={authed(<TelemetryDashboardPage />)} />
        <Route path="/telemetry/bugs" element={authed(<BugsPage />)} />
        <Route path="/telemetry/logs-settings" element={authed(<TelemetryLogsSettingsPage />)} />
        {/* The old paths, kept working for bookmarks. */}
        <Route path="/bugs" element={<Navigate to="/telemetry/bugs" replace />} />
        <Route
          path="/telemetry-logs-settings"
          element={<Navigate to="/telemetry/logs-settings" replace />}
        />
        <Route path="/server" element={<Navigate to="/server/info" replace />} />
        <Route path="/server/info" element={authed(<ServerInfoPage />)} />
        <Route path="/server/docker" element={authed(<DockerPage />)} />
        <Route path="/server/terminal" element={authed(<TerminalPage />)} />
        <Route path="/server/data-clone" element={authed(<DataClonePage />)} />
        <Route path="/slack" element={authed(<SlackSettingsPage />)} />
        <Route path="/app-builds" element={<Navigate to="/app-builds/android" replace />} />
        {/* Keyed per platform: the two routes render the same component shape, so
            without a key React reconciles in place and the table would keep the
            other platform's rows, prefs and query state. */}
        <Route
          path="/app-builds/android"
          element={authed(<AppBuildsPage key="android" platform="ANDROID" />)}
        />
        <Route
          path="/app-builds/ios"
          element={authed(<AppBuildsPage key="ios" platform="IOS" />)}
        />
        <Route path="/app-builds/settings" element={authed(<AppBuildSettingsPage />)} />
        <Route path="/aisensy" element={authed(<AisensyPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotifyHost />
    </>
  );
}
