/**
 * The pure-props pieces of the page: the card shell every section shares, the
 * status chips in the heading, and the overview facts — each on the inputs a
 * real pod turns up with (a free virtual pod, a cancelled one, a pod nobody
 * has counted views on yet).
 */
import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PodOverviewCard from '../src/PodOverviewCard';
import PodStatusChips from '../src/PodStatusChips';
import SectionCard from '../src/SectionCard';
import { testTheme } from './harness';

const mount = (ui: React.ReactNode) => render(<ThemeProvider theme={testTheme}>{ui}</ThemeProvider>);

describe('SectionCard', () => {
  it('shows the empty sentence in place of the body, and the badge and action beside the title', () => {
    mount(
      <SectionCard icon={<span>i</span>} title="Things" badge={3} action={<button>act</button>} empty="Nothing here yet.">
        <div>body</div>
      </SectionCard>,
    );

    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    expect(screen.queryByText('body')).not.toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('act')).toBeInTheDocument();
  });

  it('lets an error win over an empty state — a failed read is not an empty pod', () => {
    mount(
      <SectionCard icon={<span>i</span>} title="Things" error="boom" empty="Nothing here yet." tone="warning">
        <div>body</div>
      </SectionCard>,
    );

    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.queryByText('Nothing here yet.')).not.toBeInTheDocument();
  });

  it('renders the body, and the slim bar under the header while loading', () => {
    mount(
      <SectionCard icon={<span>i</span>} title="Things" loading>
        <div>body</div>
      </SectionCard>,
    );

    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('PodStatusChips', () => {
  const pod = (over: Record<string, unknown> = {}) => ({
    pod_type: 'PUBLIC',
    pod_mode: 'OFFLINE',
    pod_amount: 250,
    pod_occurrence: 'ONE_TIME',
    is_active: true,
    is_deleted: false,
    completed_at: null,
    venue_approval_status: 'APPROVED',
    ...over,
  });

  it('reads a paid, physical, active pod awaiting nothing', () => {
    mount(<PodStatusChips pod={pod()} />);

    for (const label of ['₹250', 'Physical', 'ONE TIME', 'Active', 'Venue: APPROVED']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('reads a free virtual weekly pod that no venue has to approve', () => {
    mount(
      <PodStatusChips
        pod={pod({ pod_type: 'FREE_PUBLIC', pod_mode: 'VIRTUAL', pod_occurrence: 'WEEKLY_REPEAT', venue_approval_status: 'NONE' })}
      />,
    );

    for (const label of ['Free', 'Virtual', 'WEEKLY REPEAT']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText(/^Venue:/)).not.toBeInTheDocument();
  });

  it('defaults an occurrence nobody recorded to ONE TIME, and a missing type to paid', () => {
    mount(<PodStatusChips pod={pod({ pod_occurrence: null, pod_type: null })} />);

    expect(screen.getByText('ONE TIME')).toBeInTheDocument();
    expect(screen.getByText('₹250')).toBeInTheDocument();
  });

  it('says Cancelled for a deleted pod, before anything else about its life', () => {
    mount(<PodStatusChips pod={pod({ is_deleted: true, completed_at: '2026-08-30T15:00:00.000Z' })} />);

    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });

  it('says Completed once completed_at is set', () => {
    mount(<PodStatusChips pod={pod({ completed_at: '2026-08-30T15:00:00.000Z' })} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('says Inactive for a live pod that was switched off', () => {
    mount(<PodStatusChips pod={pod({ is_active: false })} />);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});

describe('PodOverviewCard', () => {
  const pod = (over: Record<string, unknown> = {}) => ({
    pod_id: 'DUN-POD-4821',
    pod_mode: 'OFFLINE',
    pod_date_time: '2026-08-30T12:30:00.000Z',
    pod_end_date_time: '2026-08-30T14:00:00.000Z',
    meeting_platform: null,
    zone_name: 'South',
    seats_taken: 3,
    pod_attendees: ['u-1'],
    no_of_spots: 8,
    pod_hits: 42,
    like_count: 5,
    comment_count: 2,
    products_enabled: true,
    created_at: '2026-08-01T09:00:00.000Z',
    pod_description: 'Doubles at Court 2.',
    ...over,
  });

  it('counts SEATS, not bookings, and leaves the products line out when the flag is off', () => {
    mount(<PodOverviewCard pod={pod()} showProducts={false} />);

    expect(screen.getByText('DUN-POD-4821')).toBeInTheDocument();
    expect(screen.getByText('South')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('5 · 2')).toBeInTheDocument();
    expect(screen.getByText('Doubles at Court 2.')).toBeInTheDocument();
    expect(screen.queryByText('Products')).not.toBeInTheDocument();
  });

  it('shows the meeting platform for a virtual pod, and whether products are on', () => {
    mount(<PodOverviewCard pod={pod({ pod_mode: 'VIRTUAL', meeting_platform: 'GOOGLE_MEET' })} showProducts />);

    expect(screen.getByText('GOOGLE_MEET')).toBeInTheDocument();
    expect(screen.queryByText('Zone')).not.toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('calls an unnamed platform Online, and products Off when disabled', () => {
    mount(<PodOverviewCard pod={pod({ pod_mode: 'VIRTUAL', products_enabled: false })} showProducts />);

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('falls back to the attendee list when seats were never counted', () => {
    mount(<PodOverviewCard pod={pod({ seats_taken: null, pod_attendees: ['u-1', 'u-2'], no_of_spots: 2 })} showProducts={false} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders zeros and dashes for a pod nothing has been recorded on', () => {
    mount(
      <PodOverviewCard
        pod={pod({
          seats_taken: null,
          pod_attendees: null,
          no_of_spots: null,
          pod_hits: null,
          like_count: null,
          comment_count: null,
          zone_name: null,
          pod_description: null,
        })}
        showProducts={false}
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('0 · 0')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('Description')).not.toBeInTheDocument();
  });
});
