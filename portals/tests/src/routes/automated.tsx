import { Navigate, Route } from 'react-router';
import UnitRunsPage from '../pages/unit/runs';
import UnitRunDetailPage from '../pages/unit/run-detail';
import UnitInventoryPage from '../pages/unit/inventory';
import E2eRunsPage from '../pages/e2e';
import { E2eSettingsPage } from '../pages/e2e/settings';
import E2eFlowsPage from '../pages/e2e/flows';
import E2eFlowDetailPage from '../pages/e2e/flows/detail';
import StressRunsPage from '../pages/stress-testing/runs';
import StressRunDetailPage from '../pages/stress-testing/run-detail';
import StressSettingsPage from '../pages/stress-testing/settings';
import RegressionReportsPage from '../pages/regression/reports';
import RegressionReportDetailPage from '../pages/regression/report-detail';
import type { Authed } from './types';

/** Automated Testing: unit, E2E and stress runs, and the regression reports they produce. */
export function automatedRoutes(authed: Authed) {
  return (
    <>
      <Route path="/unit" element={<Navigate to="/unit/runs" replace />} />
      <Route path="/unit/runs" element={authed(<UnitRunsPage />)} />
      {/* One run at its own address — reloadable, bookmarkable, pasteable. */}
      <Route path="/unit/runs/:runId" element={authed(<UnitRunDetailPage />)} />
      <Route path="/unit/inventory" element={authed(<UnitInventoryPage />)} />
      {/* The workflow has no cron of its own: the schedule in Settings is the
          only thing that starts a scheduled run. */}
      <Route path="/e2e" element={<Navigate to="/e2e/runs" replace />} />
      <Route path="/e2e/runs" element={authed(<E2eRunsPage />)} />
      <Route path="/e2e/flows" element={authed(<E2eFlowsPage />)} />
      <Route path="/e2e/flows/:flowId" element={authed(<E2eFlowDetailPage />)} />
      <Route path="/e2e/settings" element={authed(<E2eSettingsPage />)} />
      {/* Load against THIS environment from GitHub runners, watched live. */}
      <Route path="/stress-testing" element={<Navigate to="/stress-testing/runs" replace />} />
      <Route path="/stress-testing/runs" element={authed(<StressRunsPage />)} />
      <Route path="/stress-testing/runs/:runId" element={authed(<StressRunDetailPage />)} />
      <Route path="/stress-testing/settings" element={authed(<StressSettingsPage />)} />
      <Route path="/regression" element={<Navigate to="/regression/reports" replace />} />
      <Route path="/regression/reports" element={authed(<RegressionReportsPage />)} />
      <Route path="/regression/reports/:reportId" element={authed(<RegressionReportDetailPage />)} />
    </>
  );
}
