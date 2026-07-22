import { describe, it, expect } from 'vitest';
import {
  HOST_DASHBOARD_ME,
  HOST_DASHBOARD_PODS,
  HOST_INSIGHTS,
} from '../queries';

function operationName(doc: unknown): string | undefined {
  const def = (doc as { definitions: Array<Record<string, unknown>> })
    .definitions[0];
  return (def?.name as { value?: string } | undefined)?.value;
}

describe('host-dashboard-page queries module', () => {
  it('HOST_DASHBOARD_ME is a query with identity, wallet and health fields', () => {
    const def = HOST_DASHBOARD_ME.definitions[0];
    expect(def.kind).toBe('OperationDefinition');
    expect(operationName(HOST_DASHBOARD_ME)).toBe('HostDashboardMe');

    const printed = JSON.stringify(HOST_DASHBOARD_ME);
    ['me', 'full_name', 'myWallet', 'balance', 'next_payout_at', 'myAccountHealth', 'total_score', 'band', 'myHostEarningsSummary', 'lifetime_earnings', 'pods_completed', 'this_month_earnings'].forEach(
      (field) => expect(printed).toContain(field),
    );
  });

  it('HOST_DASHBOARD_PODS takes host_user_id and selects pod fields', () => {
    expect(operationName(HOST_DASHBOARD_PODS)).toBe('HostDashboardPods');

    const printed = JSON.stringify(HOST_DASHBOARD_PODS);
    ['host_user_id', 'pods', 'pod_date_time', 'pod_type', 'pod_hosts_id', 'pod_attendees', 'is_active'].forEach(
      (field) => expect(printed).toContain(field),
    );
  });

  it('HOST_INSIGHTS takes from/to/months and selects partner + insights fields', () => {
    expect(operationName(HOST_INSIGHTS)).toBe('HostInsights');

    const printed = JSON.stringify(HOST_INSIGHTS);
    ['partnerDashboard', 'from', 'to', 'months', 'host', 'number_of_pods', 'host_earning', 'hostInsights', 'status_counts', 'upcoming', 'ongoing', 'completed', 'cancelled', 'monthly_earnings', 'month', 'total'].forEach(
      (field) => expect(printed).toContain(field),
    );
  });

  it('every export is a parsed GraphQL document node', () => {
    [HOST_DASHBOARD_ME, HOST_DASHBOARD_PODS, HOST_INSIGHTS].forEach((doc) => {
      expect(doc.kind).toBe('Document');
      expect(Array.isArray(doc.definitions)).toBe(true);
      expect(doc.definitions.length).toBeGreaterThan(0);
    });
  });
});
