import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { MapEmbed } from '@/components/MapEmbed';
import { PodClubCard } from '@/components/details/PodClubCard';
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
    expect(screen.getByText('Google Meet')).toBeOnTheScreen();
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
  // Four products exercise every image/stock/price fallback branch:
  //  1 image_url set; 2 image_url empty → images[0]; 3 images empty → icon +
  //  available_count null → quantity; 4 images null → icon + all-null → 0.
  const products = [
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
      images: ['http://y/c.png'],
      unit_cost: 50,
      available_count: 3,
      quantity: 0,
      total_cost: 0,
    },
    {
      product_id: '3',
      product_name: 'Mug',
      image_url: '',
      images: [],
      unit_cost: 20,
      available_count: null,
      quantity: 7,
      total_cost: 0,
    },
    {
      product_id: '4',
      product_name: 'Pin',
      image_url: '',
      images: null,
      unit_cost: null,
      available_count: null,
      quantity: null,
      total_cost: 0,
    },
  ];
  const podWith = (list = products) =>
    ({ products_enabled: true, product_requests: list }) as never;

  it('lists real products with image/stock/price fallbacks and a zero total', () => {
    renderWithProviders(
      <PodShop pod={podWith()} selectedProducts={{}} onSelectionChange={jest.fn()} />,
    );
    expect(screen.getByText('Available')).toBeOnTheScreen();
    expect(screen.getByText('Tee')).toBeOnTheScreen();
    expect(screen.getByText('Available 5')).toBeOnTheScreen();
    expect(screen.getByText('+₹100')).toBeOnTheScreen();
    expect(screen.getByText('Cap')).toBeOnTheScreen();
    // available_count null falls back to quantity; all-null → 0.
    expect(screen.getByText('Available 7')).toBeOnTheScreen();
    expect(screen.getByText('Available 0')).toBeOnTheScreen();
    expect(screen.getByText('+₹0')).toBeOnTheScreen();
    // Nothing picked yet → neutral caption + ₹0 running total.
    expect(screen.getByText('Selected product total')).toBeOnTheScreen();
    expect(screen.getByText('₹0')).toBeOnTheScreen();
  });

  it('selects a product when its row is pressed', () => {
    const onSelectionChange = jest.fn();
    renderWithProviders(
      <PodShop pod={podWith()} selectedProducts={{}} onSelectionChange={onSelectionChange} />,
    );
    fireEvent.press(screen.getByTestId('pod-shop-row-1'));
    expect(onSelectionChange).toHaveBeenCalledWith({ '1': 1 });
  });

  it('shows steppers for a picked product and increments within stock', () => {
    const onSelectionChange = jest.fn();
    renderWithProviders(
      <PodShop
        pod={podWith()}
        selectedProducts={{ '1': 2 }}
        onSelectionChange={onSelectionChange}
      />,
    );
    expect(screen.getByTestId('pod-shop-qty-1')).toHaveTextContent('2');
    expect(screen.getByText('+₹200')).toBeOnTheScreen();
    // 1 product picked → singular caption + line total in the footer.
    expect(screen.getByText('1 product selected')).toBeOnTheScreen();
    expect(screen.getByText('₹200')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-shop-inc-1'));
    expect(onSelectionChange).toHaveBeenCalledWith({ '1': 3 });
    fireEvent.press(screen.getByTestId('pod-shop-dec-1'));
    expect(onSelectionChange).toHaveBeenCalledWith({ '1': 1 });
  });

  it('removes a product when decremented to zero', () => {
    const onSelectionChange = jest.fn();
    renderWithProviders(
      <PodShop
        pod={podWith()}
        selectedProducts={{ '1': 1 }}
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.press(screen.getByTestId('pod-shop-dec-1'));
    expect(onSelectionChange).toHaveBeenCalledWith({});
  });

  it('deselects a picked product when its row is pressed again', () => {
    const onSelectionChange = jest.fn();
    renderWithProviders(
      <PodShop
        pod={podWith()}
        selectedProducts={{ '2': 1 }}
        onSelectionChange={onSelectionChange}
      />,
    );
    fireEvent.press(screen.getByTestId('pod-shop-row-2'));
    expect(onSelectionChange).toHaveBeenCalledWith({});
  });

  it('disables the increment at max stock and shows a plural caption', () => {
    renderWithProviders(
      <PodShop
        pod={podWith()}
        selectedProducts={{ '1': 5, '2': 1 }}
        onSelectionChange={jest.fn()}
      />,
    );
    // Product 1 is at its available_count (5) → the + button is disabled.
    expect(screen.getByTestId('pod-shop-inc-1').props['aria-disabled']).toBe(true);
    // Product 2 (qty 1 of 3) is still below stock → + stays enabled.
    expect(screen.getByTestId('pod-shop-inc-2').props['aria-disabled']).toBe(false);
    // Two products picked → plural caption.
    expect(screen.getByText('2 products selected')).toBeOnTheScreen();
  });

  it('shows the empty state when there are no products', () => {
    const pod = { products_enabled: false, product_requests: [] } as never;
    renderWithProviders(<PodShop pod={pod} selectedProducts={{}} onSelectionChange={jest.fn()} />);
    expect(screen.getByTestId('pod-shop-empty')).toBeOnTheScreen();
    expect(screen.getByText('Closed')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-shop-total')).toBeNull();
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

describe('PodClubCard', () => {
  it('shows the club logo, name, description and opens the club', () => {
    const onOpenClub = jest.fn();
    renderWithProviders(
      <PodClubCard
        club={{
          club_id: 'c1',
          club_name: 'Jazz Club',
          club_description: 'Live jazz every weekend',
          club_feature_images_and_videos: [{ url: 'http://x/logo.jpg' }],
        }}
        onOpenClub={onOpenClub}
      />,
    );
    expect(screen.getByText('Jazz Club')).toBeOnTheScreen();
    expect(screen.getByText('Live jazz every weekend')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-view-club'));
    expect(onOpenClub).toHaveBeenCalled();
  });

  it('falls back to an initial and omits an absent description', () => {
    renderWithProviders(
      <PodClubCard
        club={{
          club_id: 'c2',
          club_name: 'beats',
          club_description: null,
          club_feature_images_and_videos: [],
        }}
        onOpenClub={jest.fn()}
      />,
    );
    expect(screen.getByText('B')).toBeOnTheScreen();
    expect(screen.queryByText('Live jazz every weekend')).toBeNull();
  });

  it('falls back to the initial when the first media has an empty url', () => {
    renderWithProviders(
      <PodClubCard
        club={{
          club_id: 'c3',
          club_name: 'Vibe',
          club_description: null,
          club_feature_images_and_videos: [{ url: '' }],
        }}
        onOpenClub={jest.fn()}
      />,
    );
    expect(screen.getByText('V')).toBeOnTheScreen();
  });

  it('uses a "C" placeholder initial when the club name is empty', () => {
    renderWithProviders(
      <PodClubCard
        club={{
          club_id: 'c4',
          club_name: '',
          club_description: null,
          club_feature_images_and_videos: [],
        }}
        onOpenClub={jest.fn()}
      />,
    );
    expect(screen.getByText('C')).toBeOnTheScreen();
  });
});
