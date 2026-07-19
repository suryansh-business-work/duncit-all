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
jest.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({ draftRetentionDays: 3 }),
}));
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
// The apply-another-category banner is unit-tested on its own; stub it here.
jest.mock('@/components/host-manage/HostApplyBanner', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { HostApplyBanner: () => <V testID="host-apply-banner" /> };
});
// The hosting-categories card is unit-tested on its own; stub it here.
jest.mock('@/components/host-manage/HostCategoriesCard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { HostCategoriesCard: () => <V testID="host-categories-card" /> };
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

  it('opens the host dashboard & insights', () => {
    mockedUse.mockReturnValue(api({ drafts: [] }));
    renderWithProviders(<HostManageScreen />);
    fireEvent.press(screen.getByTestId('host-manage-insights'));
    expect(mockNavigate).toHaveBeenCalledWith('HostDashboard');
  });

  it('groups the categories card + apply banner above the hosted-pods section', () => {
    mockedUse.mockReturnValue(api({ drafts: [] }));
    const { UNSAFE_root } = renderWithProviders(<HostManageScreen />);
    const ids = UNSAFE_root.findAll(
      (n: { props: { testID?: unknown } }) => typeof n.props?.testID === 'string',
    ).map((n: { props: { testID?: unknown } }) => n.props.testID as string);
    const order = (id: string) => ids.indexOf(id);
    expect(order('host-categories-card')).toBeLessThan(order('host-apply-banner'));
    expect(order('host-apply-banner')).toBeLessThan(order('host-pods-section'));
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
