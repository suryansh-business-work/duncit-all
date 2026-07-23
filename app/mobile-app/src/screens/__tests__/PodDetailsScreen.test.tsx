import { Share } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodDetailsScreen } from '@/screens/PodDetailsScreen';
import { usePodDetails, useResolvedPodId } from '@/hooks/useDetails';
import { useCartStore } from '@/stores/cart.store';
import { useExploreStore } from '@/stores/explore.store';
import { useStudioModeStore } from '@/stores/studio-mode.store';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/cart', () => ({
  getCartLines: jest.fn().mockResolvedValue([]),
  setCartLines: jest.fn().mockResolvedValue(undefined),
}));

// The sheet's own behavior is covered in ProductDetailSheet.test — stub it here
// with a button that reports a picked variant, so the screen's variant→cart
// wiring is exercised without the sheet's data fetching.
jest.mock('@/components/details/ProductDetailSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    ProductDetailSheet: ({ onUpdateLine }: { onUpdateLine?: (q: number, v: unknown) => void }) =>
      onUpdateLine
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(
              Pressable,
              {
                testID: 'sheet-stub-add-variant',
                onPress: () =>
                  onUpdateLine(2, {
                    id: 'v9',
                    label: 'L / Blue',
                    unit_cost: 240,
                    image_url: 'http://x/v9.jpg',
                    max: 3,
                  }),
              },
              React.createElement(Text, null, 'stub'),
            ),
            React.createElement(
              Pressable,
              {
                testID: 'sheet-stub-add-imageless-variant',
                onPress: () =>
                  onUpdateLine(1, {
                    id: 'v10',
                    label: 'S / Red',
                    unit_cost: 220,
                    image_url: '',
                    max: 3,
                  }),
              },
              React.createElement(Text, null, 'stub2'),
            ),
          )
        : null,
  };
});

let mockSaved = false;
let mockLiked = false;
let mockLikeCount = 3;
jest.mock('@/hooks/useDetails', () => ({
  usePodDetails: jest.fn(),
  useResolvedPodId: jest.fn((p: { podId?: string }) => ({
    podId: p?.podId ?? '',
    resolving: false,
  })),
  usePodActions: () => ({
    liked: mockLiked,
    likeCount: mockLikeCount,
    saved: mockSaved,
    savePending: false,
    toggleLike: jest.fn(),
    toggleSave: jest.fn(),
  }),
  usePodComments: () => ({
    comments: [],
    isLoading: false,
    error: null,
    add: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn(),
  }),
}));

const mockBackout = jest.fn().mockResolvedValue(undefined);
const mockCancelBackout = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/usePodHistory', () => ({
  usePodBackout: () => ({ backout: mockBackout, busy: false }),
  usePodCancelBackout: () => ({ cancelBackout: mockCancelBackout, busy: false }),
}));

// Products gated on by default so the Pod Shop renders; the off path has its
// own test below.
const mockFeatureFlag = jest.fn().mockReturnValue(true);
jest.mock('@/hooks/useFeatureFlag', () => ({
  useFeatureFlag: (key: string, fallback?: boolean) => mockFeatureFlag(key, fallback),
}));
jest.mock('@/hooks/usePolicies', () => ({
  usePolicy: () => ({ data: null, isLoading: false }),
}));
jest.mock('@/hooks/usePublicFinance', () => ({
  usePublicFinance: () => ({ gstPct: 18, currency: '₹' }),
}));
let mockAds: unknown[] = [];
jest.mock('@/hooks/useActiveAds', () => ({
  useActiveAds: () => ({ ads: mockAds, loading: false }),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({ params: { podId: 'p1', title: 'Pod 1' } }),
  useFocusEffect: (cb: () => void) => cb(),
}));

const mockedPod = usePodDetails as jest.Mock;

const pod = {
  id: 'p1',
  pod_id: 'pod-1',
  pod_title: 'Sunset Jam',
  pod_description: 'A fun jam',
  pod_info: null,
  pod_images_and_videos: [],
  pod_hosts_id: [],
  host_names: ['Asha'],
  pod_attendees: ['u1'],
  // Always in the future so the expired-pod checkout guard never trips.
  pod_date_time: new Date(Date.now() + 86_400_000).toISOString(),
  pod_end_date_time: null,
  pod_mode: 'PHYSICAL',
  meeting_platform: null,
  meeting_url: null,
  meeting_notes: null,
  pod_type: 'NATIVE_FREE',
  pod_amount: 0,
  no_of_spots: 5,
  zone_name: null,
  club_id: 'c1',
  club_slug: 's',
  location_id: null,
  venue_id: null,
  place_label: 'Cafe',
  place_detail: null,
  what_this_pod_offers: ['Music'],
  available_perks: [],
  payment_terms: null,
  pod_hits: 12,
  pod_occurrence: 'ONE_TIME',
  place_charges: [],
  products_enabled: false,
  product_requests: [],
  like_count: 3,
  liked_by_me: false,
  comment_count: 1,
};

const podData = {
  pod,
  venue: null,
  location: null,
  viewerId: 'me',
  membershipState: null,
  people: [],
  categoryCrumbs: [],
  refetch: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  mockGoBack.mockClear();
  mockNavigate.mockClear();
  mockBackout.mockClear();
  mockCancelBackout.mockClear();
  mockCancelBackout.mockResolvedValue(undefined);
  mockAds = [];
  mockFeatureFlag.mockReturnValue(true);
  mockSaved = false;
  mockLiked = false;
  mockLikeCount = 3;
  useExploreStore.setState({ likeOverride: {}, commentDelta: {} });
  useStudioModeStore.setState({ mode: 'USER' });
  useCartStore.setState({ lines: [], hydrated: true });
});

describe('PodDetailsScreen', () => {
  it('shows the spinner while loading', () => {
    mockedPod.mockReturnValue({
      pod: null,
      viewerId: 'me',
      savedInitially: false,
      isLoading: true,
      refetch: jest.fn().mockResolvedValue(undefined),
    });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByTestId('pod-details-loading')).toBeOnTheScreen();
  });

  it('shows the loader while a shared slug link is still resolving', () => {
    (useResolvedPodId as jest.Mock).mockReturnValueOnce({ podId: '', resolving: true });
    mockedPod.mockReturnValue({
      pod: null,
      savedInitially: false,
      isLoading: false,
      refetch: jest.fn().mockResolvedValue(undefined),
    });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByTestId('pod-details-loading')).toBeOnTheScreen();
  });

  it('shows the error state when the pod is missing and goes back', () => {
    mockedPod.mockReturnValue({
      pod: null,
      savedInitially: false,
      isLoading: false,
      refetch: jest.fn().mockResolvedValue(undefined),
    });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByTestId('pod-details-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows the POD_DETAILS sponsored banner between the accordions and support link', () => {
    mockedPod.mockReturnValue({ ...podData, isLoading: false, savedInitially: false });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.queryByTestId('ad-slot-POD_DETAILS')).toBeNull();

    mockAds = [
      {
        id: 'ad1',
        ad_type: 'IMAGE',
        media_url: 'https://cdn/ad.jpg',
        redirect_url: null,
        ad_title: 'Sponsored Gear',
        position: 'POD_DETAILS',
      },
    ];
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByTestId('ad-slot-POD_DETAILS')).toBeOnTheScreen();
    expect(screen.getByText('Sponsored Gear')).toBeOnTheScreen();
  });

  it('reflects a saved pod and opens venue details', () => {
    mockSaved = true;
    mockedPod.mockReturnValue({
      ...podData,
      venue: { id: 'v1', venue_name: 'Hall', lat: 1.2, lng: 3.4 },
      savedInitially: true,
      isLoading: false,
    });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByTestId('pod-save')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-venue-details'));
    expect(mockNavigate).toHaveBeenCalledWith('VenueDetails', { venueId: 'v1' });
    fireEvent.press(screen.getByTestId('pod-contact-support'));
    expect(mockNavigate).toHaveBeenCalledWith('SupportTickets', {
      podId: 'p1',
      podTitle: 'Sunset Jam',
    });
  });

  it('opens, posts to, and closes the comments sheet', async () => {
    mockedPod.mockReturnValue({ ...podData, savedInitially: false, isLoading: false });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('pod-comment-btn'));
    fireEvent.changeText(screen.getByTestId('pod-comment-input'), 'Nice pod');
    fireEvent.press(screen.getByTestId('pod-comment-send'));
    fireEvent.press(screen.getByTestId('pod-comments-close'));
    expect(screen.getByTestId('pod-details-screen')).toBeOnTheScreen();
  });

  it('cancels and views terms from the backout dialog', () => {
    mockedPod.mockReturnValue({
      ...podData,
      membershipState: { is_member: true, can_join: false, can_backout: true },
      savedInitially: false,
      isLoading: false,
    });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('pod-backout'));
    fireEvent.press(screen.getByTestId('backout-view-terms'));
    expect(mockNavigate).toHaveBeenCalledWith('Policy', { slug: 'backout-terms' });
    fireEvent.press(screen.getByTestId('pod-backout'));
    fireEvent.press(screen.getByTestId('backout-cancel'));
    expect(screen.getByTestId('pod-details-screen')).toBeOnTheScreen();
  });

  it('closes the backout dialog when confirmation fails', async () => {
    mockBackout.mockRejectedValueOnce(new Error('cannot backout'));
    mockedPod.mockReturnValue({
      ...podData,
      membershipState: { is_member: true, can_join: false, can_backout: true },
      savedInitially: false,
      isLoading: false,
    });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('pod-backout'));
    fireEvent.press(screen.getByTestId('backout-confirm'));
    await waitFor(() => expect(mockBackout).toHaveBeenCalledWith('p1'));
  });

  it('renders the overview, hides the empty pod shop, social bar and goes back', () => {
    mockedPod.mockReturnValue({ ...podData, savedInitially: false, isLoading: false });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByText('Sunset Jam')).toBeOnTheScreen();
    expect(screen.getByText('People in')).toBeOnTheScreen();
    // No products listed → the Pod Shop section is not rendered at all (bug 12).
    expect(screen.queryByTestId('pod-shop')).toBeNull();
    expect(screen.getByTestId('pod-save')).toBeOnTheScreen();
    expect(screen.getByTestId('accordion-about')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-expand-all'));
    fireEvent.press(screen.getByTestId('pod-view-club'));
    fireEvent.press(screen.getByTestId('detail-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows the Pod Shop when the pod has products', () => {
    mockedPod.mockReturnValue({
      ...podData,
      pod: {
        ...podData.pod,
        club: {
          club_id: 'c1',
          club_name: 'Jazz Club',
          club_description: 'Live jazz',
          club_feature_images_and_videos: [{ url: 'http://x/logo.jpg' }],
        },
        product_requests: [
          {
            product_id: 'pr1',
            product_name: 'Drum sticks',
            available_count: 5,
            unit_cost: 200,
            image_url: '',
            images: [],
          },
        ],
      },
      savedInitially: false,
      isLoading: false,
    });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByTestId('pod-shop')).toBeOnTheScreen();
    // Club details card (with name) renders instead of just the View-club button.
    fireEvent.press(screen.getByTestId('pod-expand-all'));
    expect(screen.getByText('Jazz Club')).toBeOnTheScreen();
  });

  it('carries a selected product from the pod shop into checkout', () => {
    mockedPod.mockReturnValue({
      ...podData,
      pod: {
        ...podData.pod,
        product_requests: [
          {
            product_id: 'pr1',
            product_name: 'Drum sticks',
            available_count: 5,
            unit_cost: 200,
            image_url: '',
            images: [],
          },
        ],
      },
      savedInitially: false,
      isLoading: false,
    });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('pod-shop-row-pr1'));
    fireEvent.press(screen.getByTestId('pod-book'));
    expect(mockNavigate).toHaveBeenCalledWith('Checkout', {
      podId: 'p1',
      selectedProducts: [{ product_id: 'pr1', variant_id: '', quantity: 1, unit_cost: 200 }],
    });
  });

  it('adds a picked variant line to the cart from the product detail sheet', () => {
    mockedPod.mockReturnValue({
      ...podData,
      pod: {
        ...podData.pod,
        product_requests: [
          {
            product_id: 'pr1',
            product_name: 'Drum sticks',
            available_count: 5,
            unit_cost: 200,
            image_url: '',
            images: [],
          },
        ],
      },
      savedInitially: false,
      isLoading: false,
    });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('pod-shop-info-pr1'));
    fireEvent.press(screen.getByTestId('sheet-stub-add-variant'));
    const line = useCartStore.getState().lines.find((l) => l.variant_id === 'v9');
    expect(line).toMatchObject({
      pod_id: 'p1',
      product_id: 'pr1',
      variant_label: 'L / Blue',
      unit_cost: 240,
      quantity: 2,
      max_quantity: 3,
      image_url: 'http://x/v9.jpg',
    });
    // A variant with no image of its own falls back to the pod row's image.
    fireEvent.press(screen.getByTestId('sheet-stub-add-imageless-variant'));
    const imageless = useCartStore.getState().lines.find((l) => l.variant_id === 'v10');
    expect(imageless?.image_url).toBe('');
  });

  it('hides the Pod Shop when products are gated off, even with products', () => {
    mockFeatureFlag.mockReturnValue(false);
    mockedPod.mockReturnValue({
      ...podData,
      pod: {
        ...podData.pod,
        product_requests: [
          {
            product_id: 'pr1',
            product_name: 'Drum sticks',
            available_count: 5,
            unit_cost: 200,
            image_url: '',
            images: [],
          },
        ],
      },
      savedInitially: false,
      isLoading: false,
    });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.queryByTestId('pod-shop')).toBeNull();
  });

  it('toggles like and opens the comments sheet', () => {
    mockedPod.mockReturnValue({ ...podData, savedInitially: false, isLoading: false });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('pod-like-btn'));
    fireEvent.press(screen.getByTestId('pod-comment-btn'));
    expect(screen.getByTestId('pod-comments-sheet')).toBeOnTheScreen();
  });

  it('opens an attendee profile from the attendees avatar group', () => {
    mockedPod.mockReturnValue({ ...podData, savedInitially: false, isLoading: false });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('accordion-attendees-header'));
    fireEvent.press(screen.getByTestId('attendees-avatar-group'));
    fireEvent.press(screen.getByTestId('attendee-row-u1'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'u1' });
  });

  it('books a (free) pod via the footer CTA', () => {
    mockedPod.mockReturnValue({ ...podData, savedInitially: false, isLoading: false });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByText('Join')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-book'));
    expect(mockNavigate).toHaveBeenCalledWith('Checkout', { podId: 'p1', selectedProducts: [] });
  });

  it('sends the pod host to Host Studio instead of booking their own pod', () => {
    mockedPod.mockReturnValue({
      ...podData,
      pod: { ...pod, pod_hosts_id: ['me'] },
      savedInitially: false,
      isLoading: false,
    });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.queryByTestId('pod-book')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-go-dashboard'));
    expect(useStudioModeStore.getState().mode).toBe('HOST');
    expect(mockNavigate).toHaveBeenCalledWith('HostManage');
  });

  it('shows "Pod Booked" for an existing member and backs out instead of paying again', async () => {
    mockedPod.mockReturnValue({
      ...podData,
      membershipState: { is_member: true, can_join: false, can_backout: true },
      savedInitially: false,
      isLoading: false,
    });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByTestId('pod-booked-label')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-book')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-backout'));
    fireEvent.press(screen.getByTestId('backout-confirm'));
    await screen.findByTestId('backout-dialog');
    expect(mockBackout).toHaveBeenCalledWith('p1');
  });

  it('shows the refund estimate inside the backout dialog for a paid member', () => {
    mockedPod.mockReturnValue({
      ...podData,
      membershipState: {
        is_member: true,
        can_join: false,
        can_backout: true,
        backout_refund_amount: 450,
        backout_deduction_pct: 10,
      },
      savedInitially: false,
      isLoading: false,
    });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('pod-backout'));
    expect(screen.getByTestId('backout-refund-amount')).toBeOnTheScreen();
  });

  it('restores the booking via Keep My Spot while a backout is in process', async () => {
    mockedPod.mockReturnValue({
      ...podData,
      membershipState: {
        is_member: false,
        can_join: false,
        backout_in_process: true,
        can_cancel_backout: true,
        backout_attempts_used: 1,
        backout_attempts_max: 3,
      },
      savedInitially: false,
      isLoading: false,
    });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('pod-keep-spot'));
    expect(screen.getByTestId('keep-spot-dialog')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('keep-spot-confirm'));
    await waitFor(() => expect(mockCancelBackout).toHaveBeenCalledWith('p1'));
    expect(screen.queryByTestId('keep-spot-error')).toBeNull();
  });

  it('keeps the Keep-My-Spot dialog open with the server message on failure', async () => {
    mockCancelBackout.mockRejectedValueOnce(new Error('A replacement has been confirmed'));
    mockedPod.mockReturnValue({
      ...podData,
      membershipState: {
        is_member: false,
        can_join: false,
        backout_in_process: true,
        can_cancel_backout: true,
      },
      savedInitially: false,
      isLoading: false,
    });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('pod-keep-spot'));
    fireEvent.press(screen.getByTestId('keep-spot-confirm'));
    await screen.findByTestId('keep-spot-error');
    expect(screen.getByText('A replacement has been confirmed')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('keep-spot-cancel'));
    expect(screen.getByTestId('pod-details-screen')).toBeOnTheScreen();
  });

  it('shares the pod', () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({} as never);
    mockedPod.mockReturnValue({ ...podData, savedInitially: false, isLoading: false });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('pod-share'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('mirrors a like change to the Explore feed override', () => {
    mockedPod.mockReturnValue({ ...podData, savedInitially: false, isLoading: false });
    const { rerender } = renderWithProviders(<PodDetailsScreen />);
    // First settled render is skipped; a subsequent like change is mirrored.
    expect(useExploreStore.getState().likeOverride.p1).toBeUndefined();
    mockLiked = true;
    mockLikeCount = 4;
    rerender(<PodDetailsScreen />);
    expect(useExploreStore.getState().likeOverride.p1).toEqual({
      liked_by_me: true,
      like_count: 4,
    });
  });
});
