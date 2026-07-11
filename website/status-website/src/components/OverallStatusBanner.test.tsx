import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import OverallStatusBanner, { deriveOverallStatus } from './OverallStatusBanner';
import type { OverallRoll, ServiceState } from '../types';

const roll = (over: Partial<OverallRoll>): OverallRoll => ({
  state: 'operational',
  operational: 0,
  degraded: 0,
  down: 0,
  total: 0,
  uptime_90d: 100,
  ...over,
});

describe('deriveOverallStatus', () => {
  it('is pending while data loads', () => {
    expect(deriveOverallStatus(null).severity).toBe('info');
  });

  it('reports awaiting first checks when the catalog is empty', () => {
    const status = deriveOverallStatus(roll({ total: 0 }));
    expect(status.severity).toBe('info');
    expect(status.message).toContain('Awaiting');
  });

  it('reports all operational when every service is up', () => {
    const status = deriveOverallStatus(roll({ operational: 2, total: 2, state: 'operational' }));
    expect(status).toEqual({ severity: 'success', message: 'All systems operational' });
  });

  it('reports a degraded state as a warning with counts', () => {
    const status = deriveOverallStatus(
      roll({ operational: 1, degraded: 1, total: 2, state: 'degraded' as ServiceState })
    );
    expect(status.severity).toBe('warning');
    expect(status.message).toBe('1 of 2 services reporting issues');
  });

  it('reports an outage as an error', () => {
    const status = deriveOverallStatus(
      roll({ operational: 0, down: 2, total: 2, state: 'major_outage' as ServiceState })
    );
    expect(status.severity).toBe('error');
    expect(status.message).toBe('2 of 2 services experiencing an outage');
  });
});

describe('OverallStatusBanner', () => {
  it('renders the all-operational state with the last-checked time', () => {
    const checkedAt = new Date('2026-07-11T10:30:00');
    render(
      <OverallStatusBanner
        overall={roll({ operational: 2, total: 2, state: 'operational' })}
        lastUpdated={checkedAt}
      />
    );
    expect(screen.getByText('All systems operational')).toBeTruthy();
    expect(screen.getByText(`Last checked ${checkedAt.toLocaleTimeString()}`)).toBeTruthy();
  });

  it('renders the pending state while loading', () => {
    render(<OverallStatusBanner overall={null} lastUpdated={null} />);
    expect(screen.getByText('Checking services…')).toBeTruthy();
  });

  it('renders a degraded message', () => {
    render(
      <OverallStatusBanner
        overall={roll({ operational: 1, degraded: 1, total: 2, state: 'degraded' as ServiceState })}
        lastUpdated={null}
      />
    );
    expect(screen.getByText('1 of 2 services reporting issues')).toBeTruthy();
  });
});
