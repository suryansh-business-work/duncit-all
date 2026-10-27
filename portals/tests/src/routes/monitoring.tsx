import { Navigate, Route } from 'react-router';
import SonarqubePage from '../pages/sonarqube';
import SonarqubeSettingsPage from '../pages/sonarqube-settings';
import TelemetryDashboardPage from '../pages/telemetry-dashboard';
import BugsPage from '../pages/bugs-page';
import BugDetailPage from '../pages/bug-detail-page';
import TelemetryLogsPage from '../pages/telemetry-logs-page';
import TelemetryLogDetailPage from '../pages/telemetry-log-detail-page';
import ErrorLogsPage from '../pages/error-logs-page';
import ErrorBoundariesPage from '../pages/error-boundaries-page';
import TelemetryLogsSettingsPage from '../pages/telemetry-logs-settings';
import GraphqlMonitorOverviewPage from '../pages/graphql-monitor/overview';
import GraphqlOperationsPage from '../pages/graphql-monitor/operations';
import GraphqlOperationDetailPage from '../pages/graphql-monitor/operation-detail';
import GraphqlQueryMutationPage from '../pages/graphql-monitor/query-mutation';
import GraphqlFieldsPage from '../pages/graphql-monitor/fields';
import GraphqlErrorsPage from '../pages/graphql-monitor/errors';
import GraphqlMonitorSettingsPage from '../pages/graphql-monitor/settings';
import type { Authed } from './types';

/** Code Quality and Monitoring: SonarQube, telemetry, error boundaries and the GraphQL monitor. */
export function monitoringRoutes(authed: Authed) {
  return (
    <>
      <Route path="/code-quality" element={<Navigate to="/code-quality/sonarqube" replace />} />
      <Route path="/code-quality/sonarqube" element={authed(<SonarqubePage />)} />
      <Route path="/code-quality/sonarqube-settings" element={authed(<SonarqubeSettingsPage />)} />
      <Route path="/telemetry" element={<Navigate to="/telemetry/dashboard" replace />} />
      <Route path="/telemetry/dashboard" element={authed(<TelemetryDashboardPage />)} />
      <Route path="/telemetry/bugs" element={authed(<BugsPage />)} />
      {/* One bug / one log at its own address: reloadable, bookmarkable, pasteable. */}
      <Route path="/telemetry/bugs/:bugId" element={authed(<BugDetailPage />)} />
      <Route path="/telemetry/logs" element={authed(<TelemetryLogsPage />)} />
      <Route path="/telemetry/log/:logId" element={authed(<TelemetryLogDetailPage />)} />
      <Route path="/telemetry/error-logs" element={authed(<ErrorLogsPage />)} />
      <Route path="/telemetry/logs-settings" element={authed(<TelemetryLogsSettingsPage />)} />
      <Route path="/error-boundaries" element={authed(<ErrorBoundariesPage />)} />
      <Route path="/graphql-monitor" element={<Navigate to="/graphql-monitor/overview" replace />} />
      <Route path="/graphql-monitor/overview" element={authed(<GraphqlMonitorOverviewPage />)} />
      <Route path="/graphql-monitor/operations" element={authed(<GraphqlOperationsPage />)} />
      <Route path="/graphql-monitor/operations/:operationId" element={authed(<GraphqlOperationDetailPage />)} />
      <Route path="/graphql-monitor/query-mutation" element={authed(<GraphqlQueryMutationPage />)} />
      <Route path="/graphql-monitor/fields" element={authed(<GraphqlFieldsPage />)} />
      <Route path="/graphql-monitor/errors" element={authed(<GraphqlErrorsPage />)} />
      <Route path="/graphql-monitor/settings" element={authed(<GraphqlMonitorSettingsPage />)} />
    </>
  );
}
