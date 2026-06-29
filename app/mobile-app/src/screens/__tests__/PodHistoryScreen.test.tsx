import { fireEvent, screen } from '@testing-library/react-native';

import { PodHistoryScreen } from '@/screens/PodHistoryScreen';
import { usePodHistory, usePodHistoryCategories } from '@/hooks/usePodHistory';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/usePodHistory', () => ({
  usePodHistory: jest.fn(),
  usePodHistoryCategories: jest.fn(() => []),
}));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockedUsePodHistory = usePodHistory as jest.Mock;
const mockedCategories = usePodHistoryCategories as jest.Mock;

const item = (id: string, superId: string, categoryId: string) =>
  ({
    id,
    pod_id: `p-${id}`,
    joined_at: '2026-06-01T10:00:00Z',
    pod: {
      pod_title: `Pod ${id}`,
      pod_date_time: `2026-06-0${id}T10:00:00Z`,
      pod_amount: Number(id),
      club: { id: `club-${id}`, super_category_id: superId, category_id: categoryId },
    },
  }) as never;

const categories = [
  { id: 's1', name: 'For You', level: 'SUPER', parent_id: null },
  { id: 's2', name: 'For Your Pet', level: 'SUPER', parent_id: null },
  { id: 'c1', name: 'Sports', level: 'CATEGORY', parent_id: 's1' },
  { id: 'c2', name: 'Pet Fitness', level: 'CATEGORY', parent_id: 's2' },
] as never;

beforeEach(() => {
  mockNavigate.mockClear();
  mockedUsePodHistory.mockReset();
  mockedCategories.mockReset().mockReturnValue(categories);
});

describe('PodHistoryScreen', () => {
  it('shows a loader while fetching', () => {
    mockedUsePodHistory.mockReturnValue({ uniqueItems: [], isLoading: true });
    renderWithProviders(<PodHistoryScreen />);
    expect(screen.getByTestId('pod-history-loading')).toBeOnTheScreen();
  });

  it('surfaces a fetch error', () => {
    mockedUsePodHistory.mockReturnValue({
      uniqueItems: [],
      isLoading: false,
      error: new Error('boom'),
    });
    renderWithProviders(<PodHistoryScreen />);
    expect(screen.getByTestId('pod-history-error')).toHaveTextContent('boom');
  });

  it('shows the empty state and no filter toolbar when there is no history', () => {
    mockedUsePodHistory.mockReturnValue({ uniqueItems: [], isLoading: false });
    renderWithProviders(<PodHistoryScreen />);
    expect(screen.getByTestId('pod-history-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-history-filter-button')).toBeNull();
  });

  it('lists pods and navigates to details on tap', () => {
    mockedUsePodHistory.mockReturnValue({
      uniqueItems: [item('1', 's1', 'c1'), item('2', 's2', 'c2')],
      isLoading: false,
    });
    renderWithProviders(<PodHistoryScreen />);
    expect(screen.getByText('Pod 1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-history-card-2'));
    expect(mockNavigate).toHaveBeenCalledWith('PodHistoryDetails', { membershipId: '2' });
  });

  it('filters by Super Category → Category (cascading) and resets', () => {
    mockedUsePodHistory.mockReturnValue({
      uniqueItems: [item('1', 's1', 'c1'), item('2', 's2', 'c2')],
      isLoading: false,
    });
    renderWithProviders(<PodHistoryScreen />);

    fireEvent.press(screen.getByTestId('pod-history-filter-button'));
    // Category is gated until a Super is chosen.
    expect(screen.getByTestId('ph-cat-hint')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('ph-super-s1'));
    // Now only "For You" pods remain and its categories are selectable.
    expect(screen.queryByText('Pod 2')).toBeNull();
    fireEvent.press(screen.getByTestId('ph-cat-c1'));
    expect(screen.getByText('Pod 1')).toBeOnTheScreen();

    // Re-tapping a selected chip clears it (category then super → hint returns).
    fireEvent.press(screen.getByTestId('ph-cat-c1'));
    fireEvent.press(screen.getByTestId('ph-super-s1'));
    expect(screen.getByTestId('ph-cat-hint')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('pod-history-filter-reset'));
    expect(screen.getByText('Pod 2')).toBeOnTheScreen();
  });

  it('shows the no-match empty state when filters exclude everything', () => {
    mockedUsePodHistory.mockReturnValue({ uniqueItems: [item('1', 's1', 'c1')], isLoading: false });
    renderWithProviders(<PodHistoryScreen />);
    fireEvent.press(screen.getByTestId('pod-history-filter-button'));
    fireEvent.press(screen.getByTestId('ph-super-s2')); // no pods under "For Your Pet"
    expect(screen.getByTestId('pod-history-no-match')).toBeOnTheScreen();
  });

  it('sorts via the sort sheet', () => {
    mockedUsePodHistory.mockReturnValue({
      uniqueItems: [item('1', 's1', 'c1'), item('2', 's2', 'c2')],
      isLoading: false,
    });
    renderWithProviders(<PodHistoryScreen />);
    fireEvent.press(screen.getByTestId('pod-history-sort-button'));
    fireEvent.press(screen.getByTestId('ph-sort-PRICE_ASC'));
    // Sheet closed after pick; the list is still shown.
    expect(screen.getByText('Pod 1')).toBeOnTheScreen();
  });

  it('closes the filter and sort sheets from their close buttons', () => {
    mockedUsePodHistory.mockReturnValue({ uniqueItems: [item('1', 's1', 'c1')], isLoading: false });
    renderWithProviders(<PodHistoryScreen />);
    fireEvent.press(screen.getByTestId('pod-history-filter-button'));
    fireEvent.press(screen.getByTestId('pod-history-filter-close'));
    fireEvent.press(screen.getByTestId('pod-history-filter-button'));
    fireEvent.press(screen.getByTestId('pod-history-filter-done'));
    fireEvent.press(screen.getByTestId('pod-history-sort-button'));
    fireEvent.press(screen.getByTestId('pod-history-sort-close'));
    expect(screen.getByText('Pod 1')).toBeOnTheScreen();
  });
});
