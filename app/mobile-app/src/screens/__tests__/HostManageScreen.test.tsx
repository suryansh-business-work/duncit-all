import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { HostManageScreen } from '@/screens/HostManageScreen';
import { useHostDrafts } from '@/hooks/useHostDrafts';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
// The full app header is unit-tested on its own; stub it here (B4-3).
jest.mock('@/components/AppHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { AppHeader: () => <V testID="app-header-stub" /> };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock('@/hooks/useHostDrafts', () => ({ useHostDrafts: jest.fn() }));
// The hosted-pods section is unit-tested on its own; keep this screen test focused.
jest.mock('@/components/host-manage/HostPodsSection', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { HostPodsSection: () => <V testID="host-pods-section" /> };
});
jest.mock('@/components/host-manage/HostShareSection', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { HostShareSection: () => <V testID="host-share-section" /> };
});
const mockedUse = useHostDrafts as jest.Mock;

const drafts = [
  { id: 'd1', pod_title: 'One', step: 0, updated_at: '2026-06-12T10:00:00Z' },
  { id: 'd2', pod_title: '', step: 99, updated_at: 'bad-date' },
  { id: 'd3', pod_title: 'Three', step: 2, updated_at: null },
];

const api = (over: Record<string, unknown> = {}) => ({
  drafts,
  isLoading: false,
  remove: jest.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('HostManageScreen', () => {
  it('shows the loading state', () => {
    mockedUse.mockReturnValue(api({ drafts: [], isLoading: true }));
    renderWithProviders(<HostManageScreen />);
    expect(screen.getByTestId('host-manage-loading')).toBeOnTheScreen();
  });

  it('shows the empty state and starts a new pod', () => {
    mockedUse.mockReturnValue(api({ drafts: [] }));
    renderWithProviders(<HostManageScreen />);
    expect(screen.getByTestId('host-manage-empty')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('host-manage-create'));
    expect(mockNavigate).toHaveBeenCalledWith('CreatePod');
  });

  it('lists drafts and resumes one', () => {
    mockedUse.mockReturnValue(api());
    renderWithProviders(<HostManageScreen />);
    expect(screen.getByText('Untitled pod')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('draft-continue-d1'));
    expect(mockNavigate).toHaveBeenCalledWith('CreatePod', { draftId: 'd1' });
  });

  it('confirms and deletes a draft', async () => {
    const screenApi = api();
    mockedUse.mockReturnValue(screenApi);
    renderWithProviders(<HostManageScreen />);
    fireEvent.press(screen.getByTestId('draft-delete-d1'));
    expect(screen.getByTestId('draft-delete-confirm')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('draft-delete-confirm-btn'));
    await waitFor(() => expect(screenApi.remove).toHaveBeenCalledWith('d1'));
    await waitFor(() => expect(screen.queryByTestId('draft-delete-confirm')).toBeNull());
  });

  it('cancels a delete', () => {
    mockedUse.mockReturnValue(api());
    renderWithProviders(<HostManageScreen />);
    fireEvent.press(screen.getByTestId('draft-delete-d2'));
    fireEvent.press(screen.getByTestId('draft-delete-cancel'));
    expect(screen.queryByTestId('draft-delete-confirm')).toBeNull();
  });

  it('keeps the modal open when delete fails', async () => {
    mockedUse.mockReturnValue(api({ remove: jest.fn().mockRejectedValue(new Error('no')) }));
    renderWithProviders(<HostManageScreen />);
    fireEvent.press(screen.getByTestId('draft-delete-d3'));
    fireEvent.press(screen.getByTestId('draft-delete-confirm-btn'));
    await waitFor(() => expect(screen.getByTestId('draft-delete-confirm')).toBeOnTheScreen());
  });
});
