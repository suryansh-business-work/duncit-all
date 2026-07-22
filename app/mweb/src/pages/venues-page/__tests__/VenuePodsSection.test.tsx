import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

import VenuePodsSection, { VENUE_PODS } from '../VenuePodsSection';

// usePricing fires this internally (cache-first); provide it so no unmatched-op noise.
const PUBLIC_FINANCE = gql`
  query PublicFinanceSettingsForPricing {
    publicFinanceSettings {
      platform_fee_pct
      gst_pct
      currency_symbol
      default_backout_deduction_pct
    }
  }
`;

const financeMock = {
  request: { query: PUBLIC_FINANCE },
  result: {
    data: {
      publicFinanceSettings: {
        platform_fee_pct: 10,
        gst_pct: 18,
        currency_symbol: '₹',
        default_backout_deduction_pct: 0,
      },
    },
  },
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(Date.now() + ms).toISOString();

const pod = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  pod_id: `POD-${id}`,
  pod_title: `Pod ${id}`,
  pod_date_time: iso(5 * DAY),
  pod_end_date_time: iso(5 * DAY + 2 * HOUR),
  pod_type: ['PAID'],
  pod_amount: 500,
  pod_attendees: 3,
  no_of_spots: 10,
  host_names: ['Host'],
  pod_images_and_videos: [],
  club_id: 'club-1',
  club_slug: 'the-club',
  pod_mode: 'OFFLINE',
  place_label: 'Venue',
  place_detail: 'Addr',
  ...over,
});

// Live now => SOON rail; far future => UPCOMING; ended => PREVIOUS.
const livePod = pod('live', {
  pod_title: 'Live Jam',
  pod_type: ['FREE'],
  pod_date_time: iso(-HOUR),
  pod_end_date_time: iso(HOUR),
});
const upcomingPod = pod('up', { pod_title: 'Future Gig' });
const previousPod = pod('prev', {
  pod_title: 'Past Show',
  pod_date_time: iso(-3 * DAY),
  pod_end_date_time: iso(-3 * DAY + 2 * HOUR),
});

const podsMock = (venueId: string, pods: unknown[]) => ({
  request: { query: VENUE_PODS, variables: { venueId } },
  result: { data: { pods } },
});

const setup = (mocks: unknown[], ui: ReactElement) =>
  render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      {ui}
    </MockedProvider>,
  );

afterEach(() => {
  vi.clearAllMocks();
});

describe('VenuePodsSection', () => {
  it('shows a loading spinner before the query resolves', () => {
    setup([financeMock, podsMock('v1', [])], <VenuePodsSection venueId="v1" />);
    expect(screen.getByTestId('venue-pods-section')).toBeInTheDocument();
    expect(screen.getByText('Pods at this venue')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders the empty-state alert when the venue has no pods', async () => {
    setup([financeMock, podsMock('v1', [])], <VenuePodsSection venueId="v1" />);
    expect(
      await screen.findByText(/No pods scheduled for this club yet/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('buckets pods into the Happening soon / Upcoming / Previous rails', async () => {
    setup(
      [financeMock, podsMock('v1', [livePod, upcomingPod, previousPod])],
      <VenuePodsSection venueId="v1" />,
    );
    expect(await screen.findByText('Live Jam')).toBeInTheDocument();
    expect(screen.getByText('Happening soon')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Future Gig')).toBeInTheDocument();
    expect(screen.getByText('Past Show')).toBeInTheDocument();
    // free pod shows "Free"; paid pod shows a formatted price
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getAllByText('₹500').length).toBeGreaterThan(0);
  });

  it('navigates to the pod route when a pod card button is tapped', async () => {
    setup([financeMock, podsMock('v1', [upcomingPod])], <VenuePodsSection venueId="v1" />);
    const button = await screen.findByRole('button', { name: '₹500' });
    fireEvent.click(button);
    expect(navigate).toHaveBeenCalledWith('/club/the-club/pod/POD-up');
  });

  it('does not navigate when the pod lacks a slug', async () => {
    const noSlug = pod('ns', { pod_title: 'No Slug', club_slug: null });
    setup([financeMock, podsMock('v1', [noSlug])], <VenuePodsSection venueId="v1" />);
    fireEvent.click(await screen.findByRole('button', { name: '₹500' }));
    expect(navigate).not.toHaveBeenCalled();
  });
});
