import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import IncidentsSection from './IncidentsSection';
import type { Incident } from '../types';

const incident = (over: Partial<Incident>): Incident => ({
  id: 'i1',
  service_key: 'api',
  service_name: 'API',
  title: 'Elevated errors',
  body: 'We saw elevated 5xx responses.',
  impact: 'degraded',
  status: 'resolved',
  started_at: '2026-07-10T10:00:00.000Z',
  resolved_at: '2026-07-10T12:00:00.000Z',
  ...over,
});

describe('IncidentsSection', () => {
  it('renders nothing before incidents have loaded', () => {
    const { container } = render(<IncidentsSection incidents={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the empty state when there are no incidents', () => {
    render(<IncidentsSection incidents={[]} />);
    expect(screen.getByText('No incidents reported in the last 90 days.')).toBeTruthy();
  });

  it('renders resolved and ongoing incidents with the right labels', () => {
    render(
      <IncidentsSection
        incidents={[
          incident({ id: 'i1' }),
          incident({
            id: 'i2',
            title: 'Ongoing outage',
            impact: 'major_outage',
            body: '',
            resolved_at: null,
          }),
        ]}
      />,
    );
    expect(screen.getByText('Elevated errors')).toBeTruthy();
    expect(screen.getByText('Resolved')).toBeTruthy();
    expect(screen.getByText('Ongoing outage')).toBeTruthy();
    expect(screen.getByText('Major outage')).toBeTruthy();
    // The ongoing incident has no body text.
    expect(screen.queryByText('We saw elevated 5xx responses.')).toBeTruthy();
  });
});
