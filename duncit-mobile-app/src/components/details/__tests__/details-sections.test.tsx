import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { MapEmbed } from '@/components/MapEmbed';
import { PodInfo } from '@/components/details/PodInfo';
import { PodSchedule } from '@/components/details/PodSchedule';
import { PodShop } from '@/components/details/PodShop';
import { PodSocialBar } from '@/components/details/PodSocialBar';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/constants/config', () => ({ config: { googleMapApiKey: 'KEY' } }));

const future = (ms: number) => new Date(Date.now() + ms).toISOString();

const overviewPod = {
  pod_title: 'Jam',
  host_names: ['Asha'],
  pod_mode: 'PHYSICAL',
  pod_attendees: ['u1', 'u2'],
  no_of_spots: 4,
  pod_hits: 8,
  pod_type: 'NATIVE_PAID',
  pod_amount: 199,
  pod_occurrence: 'ONE_TIME',
  pod_date_time: '2000-01-01T00:00:00.000Z',
};

describe('PodInfo', () => {
  it('renders the overview card with countdown + spots-left chip', () => {
    renderWithProviders(<PodInfo pod={overviewPod as never} />);
    expect(screen.getByText('Jam')).toBeOnTheScreen();
    expect(screen.getByText('Hosted by Asha')).toBeOnTheScreen();
    expect(screen.getByText('₹199')).toBeOnTheScreen();
    expect(screen.getByText('Physical')).toBeOnTheScreen();
    expect(screen.getByText('One time')).toBeOnTheScreen();
    expect(screen.getByText('Pod expired')).toBeOnTheScreen();
    expect(screen.getByText('People in')).toBeOnTheScreen();
    expect(screen.getByText('2 spots left')).toBeOnTheScreen();
    expect(screen.getByText('8 views')).toBeOnTheScreen();
  });

  it('handles free + host-less + spots-less pods with a future date', () => {
    const pod = {
      ...overviewPod,
      host_names: [],
      no_of_spots: 0,
      pod_type: 'NATIVE_FREE',
      pod_date_time: future(5 * 24 * 60 * 60 * 1000),
    } as never;
    renderWithProviders(<PodInfo pod={pod as never} />);
    expect(screen.getByText('Free')).toBeOnTheScreen();
    expect(screen.queryByText(/Hosted by/)).toBeNull();
    expect(screen.getByText('5 days remaining')).toBeOnTheScreen();
    expect(screen.queryByText(/spots left/)).toBeNull();
  });
});

describe('PodSchedule', () => {
  it('shows the meeting + join button for virtual pods', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const pod = {
      pod_mode: 'VIRTUAL',
      pod_date_time: '2026-06-02T13:30:00.000Z',
      pod_end_date_time: '2026-06-02T15:30:00.000Z',
      meeting_platform: 'GOOGLE_MEET',
      meeting_url: 'https://meet.example',
      meeting_notes: 'Bring a mic',
      zone_name: null,
    } as never;
    renderWithProviders(<PodSchedule pod={pod} venue={null} location={null} />);
    expect(screen.getByText('Meeting')).toBeOnTheScreen();
    expect(screen.getByText('GOOGLE_MEET')).toBeOnTheScreen();
    expect(screen.getByText('Bring a mic')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-join-meeting'));
    expect(spy).toHaveBeenCalledWith('https://meet.example');
    spy.mockRestore();
  });

  it('falls back to the join hint when there is no meeting link', () => {
    const pod = {
      pod_mode: 'VIRTUAL',
      pod_date_time: '2026-06-02T13:30:00.000Z',
      pod_end_date_time: null,
      meeting_platform: null,
      meeting_url: null,
      meeting_notes: null,
      zone_name: null,
    } as never;
    renderWithProviders(<PodSchedule pod={pod} venue={null} location={null} />);
    expect(screen.getByText('Online')).toBeOnTheScreen();
    expect(
      screen.getByText('Meeting link will be visible after joining this pod.'),
    ).toBeOnTheScreen();
  });

  it('shows the venue, details link and map for physical pods', () => {
    const onOpenVenue = jest.fn();
    const venue = {
      id: 'v1',
      venue_name: 'Hall',
      address_line1: 'A1',
      address_line2: null,
      locality: 'Loc',
      city: 'City',
      state: 'ST',
      postal_code: '12345',
      country: 'IN',
      lat: 1.2,
      lng: 3.4,
    } as never;
    const pod = {
      pod_mode: 'PHYSICAL',
      pod_date_time: '2026-06-02T13:30:00.000Z',
      pod_end_date_time: null,
      zone_name: 'Z',
    } as never;
    renderWithProviders(
      <PodSchedule pod={pod} venue={venue} location={null} onOpenVenue={onOpenVenue} />,
    );
    expect(screen.getByText('Where')).toBeOnTheScreen();
    expect(screen.getByText(/Hall/)).toBeOnTheScreen();
    expect(screen.getByTestId('pod-map')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-venue-details'));
    expect(onOpenVenue).toHaveBeenCalledWith('v1');
  });

  it('uses the location name when there is no venue, and a dash for neither', () => {
    const location = {
      id: 'l1',
      location_name: 'Town',
      location_pincode: '99',
      location_zones: [{ zone_name: 'Z', pincode: '88' }],
    } as never;
    const withLoc = { pod_mode: 'PHYSICAL', pod_date_time: null, zone_name: 'Z' } as never;
    const { rerender } = renderWithProviders(
      <PodSchedule pod={withLoc} venue={null} location={location} />,
    );
    expect(screen.getByText('Town')).toBeOnTheScreen();

    const bare = { pod_mode: 'PHYSICAL', pod_date_time: null, zone_name: null } as never;
    rerender(<PodSchedule pod={bare} venue={null} location={null} />);
    expect(screen.getByText('—')).toBeOnTheScreen();
  });
});

describe('PodSocialBar', () => {
  it('renders both states and fires the callbacks', () => {
    const onToggleLike = jest.fn();
    const onOpenComments = jest.fn();
    const { rerender } = renderWithProviders(
      <PodSocialBar
        liked
        likeCount={5}
        commentCount={2}
        onToggleLike={onToggleLike}
        onOpenComments={onOpenComments}
      />,
    );
    expect(screen.getByText('Liked · 5')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-like-btn'));
    fireEvent.press(screen.getByTestId('pod-comment-btn'));
    expect(onToggleLike).toHaveBeenCalled();
    expect(onOpenComments).toHaveBeenCalled();

    rerender(
      <PodSocialBar
        liked={false}
        likeCount={0}
        commentCount={0}
        onToggleLike={onToggleLike}
        onOpenComments={onOpenComments}
      />,
    );
    expect(screen.getByText('Like · 0')).toBeOnTheScreen();
  });
});

describe('PodShop', () => {
  it('lists real products', () => {
    const pod = {
      products_enabled: true,
      product_requests: [
        {
          product_id: '1',
          product_name: 'Tee',
          image_url: 'http://x/i.png',
          images: [],
          unit_cost: 100,
          available_count: 5,
          quantity: 0,
          total_cost: 0,
        },
        {
          product_id: '2',
          product_name: 'Cap',
          image_url: '',
          images: [],
          unit_cost: 50,
          available_count: 3,
          quantity: 0,
          total_cost: 0,
        },
      ],
    } as never;
    renderWithProviders(<PodShop pod={pod} />);
    expect(screen.getByText('Available')).toBeOnTheScreen();
    expect(screen.getByText('Tee')).toBeOnTheScreen();
    expect(screen.getByText('Available 5')).toBeOnTheScreen();
    expect(screen.getByText('₹100')).toBeOnTheScreen();
    expect(screen.getByText('Cap')).toBeOnTheScreen();
  });

  it('shows the empty state when there are no products', () => {
    const pod = { products_enabled: false, product_requests: [] } as never;
    renderWithProviders(<PodShop pod={pod} />);
    expect(screen.getByTestId('pod-shop-empty')).toBeOnTheScreen();
    expect(screen.getByText('Closed')).toBeOnTheScreen();
  });
});

describe('MapEmbed', () => {
  it('renders the embed and opens external maps', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    renderWithProviders(<MapEmbed query="Delhi, India" />);
    expect(screen.getByTestId('pod-map')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('map-open-external'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('renders nothing without a query', () => {
    renderWithProviders(<MapEmbed query="" />);
    expect(screen.queryByTestId('pod-map')).toBeNull();
  });
});
