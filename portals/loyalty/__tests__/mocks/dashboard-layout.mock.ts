import type { MockedResponse } from '@apollo/client/testing';
import { MY_DASHBOARD_LAYOUT } from '@duncit/dashboard';

/**
 * The saved-layout read every `DuncitDashboard` page makes on mount, answered
 * the way the server answers a reader who has never rearranged that dashboard
 * (`myDashboardLayout: null`), so the page renders its default slots.
 *
 * Without it the query goes unanswered, the dashboard reports "could not load
 * your layout" in an alert of its own, and a page test looking for ITS alert
 * finds two.
 */
export const dashboardLayoutMock = (dashboardId: string): MockedResponse => ({
  request: { query: MY_DASHBOARD_LAYOUT, variables: { dashboard_id: dashboardId } },
  result: { data: { myDashboardLayout: null } },
  maxUsageCount: 10,
});
