import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ClubPodsScreen } from '@/screens/ClubPodsScreen';
import { useClubAdminPods } from '@/hooks/useClubAdminPods';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
let mockParams: { clubId: string; notice?: string };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: mockNavigate }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('@/hooks/useClubAdminPods', () => ({ useClubAdminPods: jest.fn() }));

const mockOpenActions = jest.fn();
const mockOpenPod = jest.fn();
let mockDeleteError: string | null;
let mockOnDeleted: (() => void) | undefined;
jest.mock('@/components/club-admin/pods/useClubPodSheets', () => ({
  useClubPodSheets: (opts: { onDeleted: () => void }) => {
    mockOnDeleted = opts.onDeleted;
    return {
      openActions: mockOpenActions,
      openPod: mockOpenPod,
      deleteError: mockDeleteError,
      sheets: null,
    };
  },
}));

const mockUsePods = useClubAdminPods as jest.Mock;

const pod = (id: string) => ({
  id,
  pod_id: id,
  club_slug: 'jam',
  pod_title: `Pod ${id}`,
  pod_date_time: '2031-05-01T10:00:00.000Z',
  no_of_spots: 10,
  seats_taken: 3,
  host_names: ['Asha'],
  is_active: true,
  is_deleted: false,
  completed_at: null,
  venue_approval_status: 'APPROVED',
  place_label: 'Cafe Jam',
  pod_type: 'PAID',
  pod_amount: 200,
  attendance: { attended_seats: 0, booked_seats: 3, recorded: false },
});

const refetch = jest.fn();
const loadMore = jest.fn();
const state = (over: Record<string, unknown> = {}) =>
  mockUsePods.mockReturnValue({
    rows: [pod('p1'), pod('p2')],
    total: 2,
    isLoading: false,
    isLoadingMore: false,
    hasError: false,
    hasMore: false,
    loadMore,
    refetch,
    ...over,
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { clubId: 'club-1' };
  mockDeleteError = null;
  state();
});

describe('ClubPodsScreen', () => {
  it('lists the club pods and routes row presses to the sheets', () => {
    renderWithProviders(<ClubPodsScreen />);
    expect(screen.getByTestId('club-pod-p1')).toBeOnTheScreen();
    expect(screen.getByTestId('club-pod-p2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-pod-p2-open'));
    expect(mockOpenPod).toHaveBeenCalledWith(expect.objectContaining({ id: 'p2' }));
    fireEvent.press(screen.getByTestId('club-pod-p1-actions'));
    expect(mockOpenActions).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
    expect(screen.queryByTestId('club-pods-empty')).toBeNull();
  });

  it('asks for the club, no status and no search at first', () => {
    renderWithProviders(<ClubPodsScreen />);
    expect(mockUsePods).toHaveBeenLastCalledWith('club-1', '', '');
  });

  it('narrows by status through the shared filter', () => {
    renderWithProviders(<ClubPodsScreen />);
    fireEvent.press(screen.getByTestId('club-pods-status-DRAFT'));
    expect(mockUsePods).toHaveBeenLastCalledWith('club-1', 'DRAFT', '');
  });

  it('searches server-side with the trimmed text once typing pauses', async () => {
    renderWithProviders(<ClubPodsScreen />);
    fireEvent.changeText(screen.getByTestId('field-club-pods-search'), '  jam ');
    await waitFor(() => expect(mockUsePods).toHaveBeenLastCalledWith('club-1', '', 'jam'), {
      timeout: 3000,
    });
  });

  it('opens the editor from the new-pod button', () => {
    renderWithProviders(<ClubPodsScreen />);
    fireEvent.press(screen.getByTestId('club-pods-new'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubPodEditor', { clubId: 'club-1' });
  });

  it('shows a spinner while loading and neither empty state nor rows', () => {
    state({ isLoading: true, rows: [] });
    renderWithProviders(<ClubPodsScreen />);
    expect(screen.getByTestId('club-pods-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-pods-empty')).toBeNull();
  });

  it('says so when the club has no pods', () => {
    state({ rows: [], total: 0 });
    renderWithProviders(<ClubPodsScreen />);
    expect(screen.getByTestId('club-pods-empty')).toBeOnTheScreen();
  });

  it('shows a retryable error instead of an empty state', () => {
    state({ rows: [], hasError: true });
    renderWithProviders(<ClubPodsScreen />);
    expect(screen.getByTestId('club-pods-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-pods-empty')).toBeNull();
    fireEvent.press(screen.getByTestId('club-pods-error-retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('pages in more pods', () => {
    state({ hasMore: true });
    renderWithProviders(<ClubPodsScreen />);
    fireEvent.press(screen.getByTestId('club-pods-more'));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it.each(['created', 'updated', 'draft'])(
    'confirms what the editor did (%s) and re-reads the list',
    (kind) => {
      mockParams = { clubId: 'club-1', notice: kind };
      renderWithProviders(<ClubPodsScreen />);
      expect(screen.getByTestId('club-pods-notice')).toBeOnTheScreen();
      expect(refetch).toHaveBeenCalledTimes(1);
    },
  );

  it('shows no confirmation for an unknown notice kind', () => {
    mockParams = { clubId: 'club-1', notice: 'mystery' };
    renderWithProviders(<ClubPodsScreen />);
    expect(screen.queryByTestId('club-pods-notice')).toBeNull();
  });

  it('confirms a deletion once the sheets report it', () => {
    renderWithProviders(<ClubPodsScreen />);
    expect(screen.queryByTestId('club-pods-notice')).toBeNull();
    act(() => mockOnDeleted?.());
    expect(screen.getByTestId('club-pods-notice')).toBeOnTheScreen();
  });

  it('shows why a delete was refused', () => {
    mockDeleteError = 'Pod has paid guests';
    renderWithProviders(<ClubPodsScreen />);
    expect(screen.getByTestId('club-pods-delete-error')).toHaveTextContent('Pod has paid guests');
  });
});
