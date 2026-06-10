import { fireEvent, screen } from '@testing-library/react-native';

import { PodHistoryScreen } from '@/screens/PodHistoryScreen';
import { usePodHistory } from '@/hooks/usePodHistory';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/usePodHistory', () => ({ usePodHistory: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

const mockedUsePodHistory = usePodHistory as jest.Mock;
const item = (id: string) =>
  ({
    id,
    pod_id: `p-${id}`,
    joined_at: '2026-06-01T10:00:00Z',
    pod: { pod_title: `Pod ${id}` },
  }) as never;

beforeEach(() => {
  mockNavigate.mockClear();
  mockedUsePodHistory.mockReset();
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

  it('shows the empty state', () => {
    mockedUsePodHistory.mockReturnValue({ uniqueItems: [], isLoading: false });
    renderWithProviders(<PodHistoryScreen />);
    expect(screen.getByTestId('pod-history-empty')).toBeOnTheScreen();
  });

  it('lists pods and navigates to details on tap', () => {
    mockedUsePodHistory.mockReturnValue({ uniqueItems: [item('1'), item('2')], isLoading: false });
    renderWithProviders(<PodHistoryScreen />);
    expect(screen.getByText('Pod 1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod-history-card-2'));
    expect(mockNavigate).toHaveBeenCalledWith('PodHistoryDetails', { membershipId: '2' });
  });
});
