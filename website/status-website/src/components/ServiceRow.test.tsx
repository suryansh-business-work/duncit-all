import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ServiceRow from './ServiceRow';
import type { ServiceState, ServiceSummary, StatusService } from '../types';

const service: StatusService = {
  key: 'api',
  name: 'API',
  url: 'https://server.test',
  description: 'Core API',
};

const summaryWith = (state: ServiceState, over: Partial<ServiceSummary> = {}): ServiceSummary => ({
  latest: null,
  uptime_24h: 99.9,
  uptime_7d: 99.9,
  uptime_90d: 99.5,
  state,
  active_incidents: 0,
  daily: [],
  ...over,
});

describe('ServiceRow', () => {
  it('renders a no-data row when there is no summary', () => {
    render(<ServiceRow service={service} summary={null} divider onSelect={vi.fn()} />);
    expect(screen.getByText('No data')).toBeTruthy();
    // uptime chips fall back to a dash.
    expect(screen.getByText('24h · —')).toBeTruthy();
  });

  it('renders an operational row with the daily strip and active incidents', () => {
    render(
      <ServiceRow
        service={service}
        summary={summaryWith('operational', {
          active_incidents: 2,
          daily: [{ date: '2026-07-11', uptime: 100, state: 'operational' }],
        })}
        divider={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('Operational')).toBeTruthy();
    expect(screen.getByText('2 active')).toBeTruthy();
    expect(screen.getByText('24h · 99.90%')).toBeTruthy();
  });

  it('maps a degraded state to a warning dot', () => {
    render(<ServiceRow service={service} summary={summaryWith('degraded')} divider onSelect={vi.fn()} />);
    expect(screen.getByText('Degraded')).toBeTruthy();
  });

  it('maps an outage state to an error dot', () => {
    render(
      <ServiceRow service={service} summary={summaryWith('major_outage')} divider onSelect={vi.fn()} />,
    );
    expect(screen.getByText('Major outage')).toBeTruthy();
  });

  it('selects the service when the row is clicked but not when the link is', () => {
    const onSelect = vi.fn();
    render(<ServiceRow service={service} summary={null} divider onSelect={onSelect} />);

    fireEvent.click(screen.getByLabelText('Open API in a new tab'));
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Show status and details for API'));
    expect(onSelect).toHaveBeenCalledWith(service);
  });
});
