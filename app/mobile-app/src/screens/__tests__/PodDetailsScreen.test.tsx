import { Share } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodDetailsScreen } from '@/screens/PodDetailsScreen';
import { usePodDetails } from '@/hooks/useDetails';
import { renderWithProviders } from '@/utils/test-utils';

let mockSaved = false;
jest.mock('@/hooks/useDetails', () => ({
  usePodDetails: jest.fn(),
  usePodActions: () => ({
    liked: false,
    likeCount: 3,
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
jest.mock('@/hooks/usePodHistory', () => ({
  usePodBackout: () => ({ backout: mockBackout, busy: false }),
}));
jest.mock('@/hooks/usePolicies', () => ({
  usePolicy: () => ({ data: null, isLoading: false }),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
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
  pod_date_time: '2026-06-12T18:30:00.000Z',
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
  refetch: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  mockGoBack.mockClear();
  mockNavigate.mockClear();
  mockBackout.mockClear();
  mockSaved = false;
});

describe('PodDetailsScreen', () => {
  it('shows the spinner while loading', () => {
    mockedPod.mockReturnValue({ pod: null, savedInitially: false, isLoading: true });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByTestId('pod-details-loading')).toBeOnTheScreen();
  });

  it('shows the error state when the pod is missing and goes back', () => {
    mockedPod.mockReturnValue({ pod: null, savedInitially: false, isLoading: false });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByTestId('pod-details-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
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

  it('renders the overview, pod shop empty state, social bar and goes back', () => {
    mockedPod.mockReturnValue({ ...podData, savedInitially: false, isLoading: false });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByText('Sunset Jam')).toBeOnTheScreen();
    expect(screen.getByText('People in')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-shop-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-save')).toBeOnTheScreen();
    expect(screen.getByTestId('accordion-about')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-expand-all'));
    fireEvent.press(screen.getByTestId('pod-view-club'));
    fireEvent.press(screen.getByTestId('detail-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('toggles like and opens the comments sheet', () => {
    mockedPod.mockReturnValue({ ...podData, savedInitially: false, isLoading: false });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('pod-like-btn'));
    fireEvent.press(screen.getByTestId('pod-comment-btn'));
    expect(screen.getByTestId('pod-comments-sheet')).toBeOnTheScreen();
  });

  it('books a (free) pod via the footer CTA', () => {
    mockedPod.mockReturnValue({ ...podData, savedInitially: false, isLoading: false });
    renderWithProviders(<PodDetailsScreen />);
    expect(screen.getByText('Join')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-book'));
    expect(mockNavigate).toHaveBeenCalledWith('Checkout', { podId: 'p1' });
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

  it('shares the pod', () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({} as never);
    mockedPod.mockReturnValue({ ...podData, savedInitially: false, isLoading: false });
    renderWithProviders(<PodDetailsScreen />);
    fireEvent.press(screen.getByTestId('pod-share'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
