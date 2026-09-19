import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage } from '@duncit/shell';
import { NotifyHost } from '@duncit/dialogs';
import LoginPage from './pages/LoginPage';
import EnvironmentPage from './pages/environment';
import PortalModesPage from './pages/portal-modes';
import FeatureFlagsPage from './pages/feature-flags-page/FeatureFlagsPage';
import AuthenticationPage from './pages/AuthenticationPage';
import PackagesDocsPage from './pages/packages-docs';
import PackageUpdatesPage from './pages/package-updates';
import TelemetryDashboardPage from './pages/telemetry-dashboard';
import BugsPage from './pages/bugs-page';
import BugDetailPage from './pages/bug-detail-page';
import TelemetryLogsPage from './pages/telemetry-logs-page';
import TelemetryLogDetailPage from './pages/telemetry-log-detail-page';
import ErrorLogsPage from './pages/error-logs-page';
import TelemetryLogsSettingsPage from './pages/telemetry-logs-settings';
import ServerInfoPage from './pages/server/ServerInfoPage';
import DockerPage from './pages/server/DockerPage';
import TerminalPage from './pages/server/TerminalPage';
import DataClonePage from './pages/data-clone';
import AccountDeletionsPage from './pages/account-deletions';
import DbBackupsPage from './pages/database/backups';
import DbInfoPage from './pages/database/info';
import RateLimitSystemsPage from './pages/rate-limiting/systems';
import RateLimitRulesPage from './pages/rate-limiting/rules';
import RateLimitBlockedPage from './pages/rate-limiting/blocked';
import RateLimitSettingsPage from './pages/rate-limiting/settings';
import AppBuildsPage from './pages/app-builds';
import AppBuildSettingsPage from './pages/app-builds/AppBuildSettingsPage';
import StoreListingPage from './pages/app-builds/store-listing';
import E2eRunsPage from './pages/e2e';
import { E2eSettingsPage } from './pages/e2e/settings';
import E2eFlowsPage from './pages/e2e/flows';
import E2eFlowDetailPage from './pages/e2e/flows/detail';
import StressRunsPage from './pages/stress-testing/runs';
import StressRunDetailPage from './pages/stress-testing/run-detail';
import StressSettingsPage from './pages/stress-testing/settings';
import GraphqlMonitorOverviewPage from './pages/graphql-monitor/overview';
import GraphqlOperationsPage from './pages/graphql-monitor/operations';
import GraphqlOperationDetailPage from './pages/graphql-monitor/operation-detail';
import GraphqlQueryMutationPage from './pages/graphql-monitor/query-mutation';
import GraphqlFieldsPage from './pages/graphql-monitor/fields';
import GraphqlErrorsPage from './pages/graphql-monitor/errors';
import GraphqlMonitorSettingsPage from './pages/graphql-monitor/settings';
import TableApiSettingsPage from './pages/table-api-settings';
import DnsRecordsPage from './pages/dns';
import GoogleAnalyticsPage from './pages/google-analytics';
import Msg91SettingsPage from './pages/msg91-settings';
// The Communications console's own pages, mounted here as they are — one
// implementation, two doors (rules 34/40). The Dockerfile copies that console's
// src for the build, and the deploy filter rebuilds this console when it changes.
import Msg91LogsPage from '../../communications/src/pages/msg91-otp/logs';
import Msg91AnalyticsPage from '../../communications/src/pages/msg91-otp/analytics';
import StatusReportsPage from './pages/status-reports-page';
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
        <Route path="/package-docs" element={authed(<PackagesDocsPage />)} />
        {/* What every package.json declares, beside what npm publishes today. */}
        <Route path="/package-updates" element={authed(<PackageUpdatesPage />)} />
        {/* The old path, kept working for bookmarks. */}
        <Route path="/emails/docs" element={<Navigate to="/package-docs" replace />} />
        <Route path="/telemetry" element={<Navigate to="/telemetry/dashboard" replace />} />
        <Route path="/telemetry/dashboard" element={authed(<TelemetryDashboardPage />)} />
        <Route path="/telemetry/bugs" element={authed(<BugsPage />)} />
        {/* One bug at its own address — reloadable, bookmarkable, pasteable. */}
        <Route path="/telemetry/bugs/:bugId" element={authed(<BugDetailPage />)} />
        <Route path="/telemetry/logs" element={authed(<TelemetryLogsPage />)} />
        {/* One log at its own address — reloadable, bookmarkable, pasteable. */}
        <Route path="/telemetry/log/:logId" element={authed(<TelemetryLogDetailPage />)} />
        <Route path="/telemetry/error-logs" element={authed(<ErrorLogsPage />)} />
        <Route path="/telemetry/logs-settings" element={authed(<TelemetryLogsSettingsPage />)} />
        {/* The old paths, kept working for bookmarks. */}
        <Route path="/bugs" element={<Navigate to="/telemetry/bugs" replace />} />
        <Route
          path="/telemetry-logs-settings"
          element={<Navigate to="/telemetry/logs-settings" replace />}
        />
        {/* What every GraphQL operation costs — the numbers Apollo GraphOS
            reports, measured on this server and kept in its own database. */}
        <Route path="/graphql-monitor" element={<Navigate to="/graphql-monitor/overview" replace />} />
        <Route path="/graphql-monitor/overview" element={authed(<GraphqlMonitorOverviewPage />)} />
        <Route path="/graphql-monitor/operations" element={authed(<GraphqlOperationsPage />)} />
        {/* One operation at its own address — reloadable, bookmarkable, pasteable. */}
        <Route path="/graphql-monitor/operations/:operationId" element={authed(<GraphqlOperationDetailPage />)} />
        <Route path="/graphql-monitor/query-mutation" element={authed(<GraphqlQueryMutationPage />)} />
        <Route path="/graphql-monitor/fields" element={authed(<GraphqlFieldsPage />)} />
        <Route path="/graphql-monitor/errors" element={authed(<GraphqlErrorsPage />)} />
        <Route path="/graphql-monitor/settings" element={authed(<GraphqlMonitorSettingsPage />)} />
        {/* Each person's token for every portal table's GET API. */}
        <Route path="/table-api" element={<Navigate to="/table-api/settings" replace />} />
        <Route path="/table-api/settings" element={authed(<TableApiSettingsPage />)} />
        <Route path="/server" element={<Navigate to="/server/info" replace />} />
        <Route path="/server/info" element={authed(<ServerInfoPage />)} />
        <Route path="/server/docker" element={authed(<DockerPage />)} />
        <Route path="/server/terminal" element={authed(<TerminalPage />)} />
        {/* Database. Data Clone moved here from /server; the old path still
            resolves so a bookmark or a pasted link keeps working. */}
        <Route path="/database" element={<Navigate to="/database/info" replace />} />
        <Route path="/database/info" element={authed(<DbInfoPage />)} />
        <Route path="/database/backups" element={authed(<DbBackupsPage />)} />
        <Route path="/database/data-clone" element={authed(<DataClonePage />)} />
        <Route path="/server/data-clone" element={<Navigate to="/database/data-clone" replace />} />
        {/* The GoDaddy zone behind every *.duncit.com host. */}
        <Route path="/dns" element={<Navigate to="/dns/records" replace />} />
        <Route path="/dns/records" element={authed(<DnsRecordsPage />)} />
        {/* The GA4 tag each Duncit website loads, one per website. */}
        <Route path="/google-analytics" element={authed(<GoogleAnalyticsPage />)} />
        {/* MSG91 OTP Logs: the widget's records, read live from MSG91, beside
            the keys that read them — Settings is the MSG91 category of
            Environment Variables on a page of its own. */}
        <Route path="/msg91-otp" element={<Navigate to="/msg91-otp/logs" replace />} />
        <Route path="/msg91-otp/logs" element={authed(<Msg91LogsPage />)} />
        <Route path="/msg91-otp/analytics" element={authed(<Msg91AnalyticsPage />)} />
        <Route path="/msg91-otp/settings" element={authed(<Msg91SettingsPage />)} />
        {/* Rate limiting. Systems is the landing page: which callers exist and
            what they spend is what a limit has to be written against. */}
        <Route path="/rate-limiting" element={<Navigate to="/rate-limiting/systems" replace />} />
        <Route path="/rate-limiting/systems" element={authed(<RateLimitSystemsPage />)} />
        <Route path="/rate-limiting/rules" element={authed(<RateLimitRulesPage />)} />
        <Route path="/rate-limiting/blocked" element={authed(<RateLimitBlockedPage />)} />
        <Route path="/rate-limiting/settings" element={authed(<RateLimitSettingsPage />)} />
        {/* What people reported by hand on status.duncit.com — the breakage the
            probes on that page cannot see. */}
        <Route path="/status-reports" element={authed(<StatusReportsPage />)} />
        <Route path="/account-deletions" element={authed(<AccountDeletionsPage />)} />
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
        <Route path="/app-builds/store-listing" element={authed(<StoreListingPage />)} />
        {/* Every run of the end-to-end suite, and the nightly schedule that
            produces most of them. The workflow has no cron of its own — the
            schedule below is the only thing that starts a scheduled run. */}
        <Route path="/e2e" element={<Navigate to="/e2e/runs" replace />} />
        <Route path="/e2e/runs" element={authed(<E2eRunsPage />)} />
        <Route path="/e2e/flows" element={authed(<E2eFlowsPage />)} />
        <Route path="/e2e/flows/:flowId" element={authed(<E2eFlowDetailPage />)} />
        <Route path="/e2e/settings" element={authed(<E2eSettingsPage />)} />
        {/* Load against THIS environment from GitHub runners, watched live: the
            server under test records the time series and enforces the guardrails. */}
        <Route path="/stress-testing" element={<Navigate to="/stress-testing/runs" replace />} />
        <Route path="/stress-testing/runs" element={authed(<StressRunsPage />)} />
        {/* One run at its own address — live while it runs, the record afterwards. */}
        <Route path="/stress-testing/runs/:runId" element={authed(<StressRunDetailPage />)} />
        <Route path="/stress-testing/settings" element={authed(<StressSettingsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotifyHost />
    </>
  );
}
