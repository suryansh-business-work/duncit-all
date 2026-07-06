import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import HostPodsSection from './HostPodsSection';

const fmt = (v: string | null | undefined) => (v ? 'FMT' : '');

const pods = [
  { id: '1', pod_title: 'Alpha', pod_date_time: '2026-01-01', pod_end_date_time: null, pod_mode: 'PHYSICAL', is_active: true, venue_approval_status: 'NONE', host_names: [], club_slug: 'club-a' },
  { id: '2', pod_title: 'Beta', pod_date_time: '', pod_end_date_time: null, pod_mode: 'VIRTUAL', is_active: false, venue_approval_status: 'NONE', host_names: [], club_slug: '' },
];

describe('HostPodsSection', () => {
  it('renders pods with status and fallbacks', () => {
    render(<HostPodsSection title="Upcoming pods" emptyLabel="None" pods={pods as never} formatDateTime={fmt} />);
    expect(screen.getByText('Upcoming pods')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('club-a')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('FMT')).toBeInTheDocument();
    // Beta has an empty club_slug and an unformattable date → both show '—'.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('shows the empty label when there are no pods', () => {
    render(<HostPodsSection title="Hosted pods" emptyLabel="No pods hosted yet." pods={[]} formatDateTime={fmt} />);
    expect(screen.getByText('No pods hosted yet.')).toBeInTheDocument();
  });
});
