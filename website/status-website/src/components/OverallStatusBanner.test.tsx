import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import OverallStatusBanner, { deriveOverallStatus } from './OverallStatusBanner';
import type { LatestCheck, ServiceGroup, SummaryResponse } from '../types';

const latest = (ok: boolean): LatestCheck => ({
  ok,
  status_code: ok ? 200 : null,
  latency_ms: ok ? 100 : null,
  checked_at: '2026-07-11T00:00:00.000Z',
});

const groups: ServiceGroup[] = [
  {
    title: 'Consoles',
    items: [
      { key: 'admin', name: 'Admin', url: 'https://admin.duncit.com/', description: 'Admin' },
      { key: 'crm', name: 'CRM', url: 'https://crm.duncit.com/', description: 'CRM' },
    ],
  },
];

const summaryOf = (states: Record<string, LatestCheck | null>): SummaryResponse => ({
  generated_at: '2026-07-11T00:00:00.000Z',
  services: Object.fromEntries(
    Object.entries(states).map(([key, value]) => [
      key,
      { latest: value, uptime_24h: null, uptime_7d: null, uptime_90d: null },
    ]),
  ),
});

describe('deriveOverallStatus', () => {
  it('is pending while data loads', () => {
    expect(deriveOverallStatus(null, null).severity).toBe('info');
  });

  it('reports awaiting first checks when no service has data', () => {
    const status = deriveOverallStatus(groups, summaryOf({ admin: null, crm: null }));
    expect(status.severity).toBe('info');
    expect(status.message).toContain('Awaiting');
  });

  it('reports all operational when every service is up', () => {
    const status = deriveOverallStatus(groups, summaryOf({ admin: latest(true), crm: latest(true) }));
    expect(status).toEqual({ severity: 'success', message: 'All systems operational' });
  });

  it('reports a partial outage with counts', () => {
    const status = deriveOverallStatus(groups, summaryOf({ admin: latest(true), crm: latest(false) }));
    expect(status).toEqual({ severity: 'warning', message: '1 of 2 services operational' });
  });

  it('reports a full outage as an error', () => {
    const status = deriveOverallStatus(groups, summaryOf({ admin: latest(false), crm: latest(false) }));
    expect(status).toEqual({ severity: 'error', message: '0 of 2 services operational' });
  });
});

describe('OverallStatusBanner', () => {
  it('renders the all-operational state with the last-checked time', () => {
    const checkedAt = new Date('2026-07-11T10:30:00');
    render(
      <OverallStatusBanner
        groups={groups}
        summary={summaryOf({ admin: latest(true), crm: latest(true) })}
        lastUpdated={checkedAt}
      />,
    );
    expect(screen.getByText('All systems operational')).toBeTruthy();
    expect(screen.getByText(`Last checked ${checkedAt.toLocaleTimeString()}`)).toBeTruthy();
  });

  it('renders the pending state while loading', () => {
    render(<OverallStatusBanner groups={null} summary={null} lastUpdated={null} />);
    expect(screen.getByText('Checking services…')).toBeTruthy();
  });

  it('renders a partial-outage message', () => {
    render(
      <OverallStatusBanner
        groups={groups}
        summary={summaryOf({ admin: latest(true), crm: latest(false) })}
        lastUpdated={null}
      />,
    );
    expect(screen.getByText('1 of 2 services operational')).toBeTruthy();
  });
});
