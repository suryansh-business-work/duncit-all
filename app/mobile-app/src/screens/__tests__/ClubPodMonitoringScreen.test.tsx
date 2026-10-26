import { act, fireEvent, screen } from '@testing-library/react-native';

import { useClubAdminAuditLogs } from '@/hooks/useClubAdminAuditLogs';
import { ClubPodMonitoringScreen } from '@/screens/ClubPodMonitoringScreen/ClubPodMonitoringScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDateTime: (value: string) => `at ${value}` }),
}));
jest.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: (value: string) => value }));
jest.mock('@/hooks/useClubAdminAuditLogs', () => ({ useClubAdminAuditLogs: jest.fn() }));
jest.mock('@/components/StackScreen', () => ({
  StackScreen: ({
    title,
    testID,
    children,
  }: {
    title: string;
    testID: string;
    children: unknown;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text, View } = require('react-native');
    return (
      <View testID={testID}>
        <Text testID="screen-title">{title}</Text>
        {children}
      </View>
    );
  },
}));
jest.mock('@/components/PullToRefresh', () => ({
  RefreshScrollView: ({ children }: { children: unknown }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

const logsMock = jest.mocked(useClubAdminAuditLogs);

const row = (id: string, patch: Record<string, unknown> = {}) => ({
  id,
  pod_id: 'p1',
  pod_title: `Pod ${id}`,
  club_id: 'c1',
  actor_user_id: 'u1',
  actor_name: 'Asha',
  source: 'HOST',
  action: 'UPDATE',
  changes: [],
  note: '',
  ai_risk: 'LOW',
  ai_summary: '',
  ai_reviewed_at: null,
  created_at: '2026-10-01T10:00:00Z',
  ...patch,
});

const mount = (patch: Record<string, unknown> = {}) => {
  const state = {
    rows: [row('a1'), row('a2')],
    total: 2,
    isLoading: false,
    isLoadingMore: false,
    hasError: false,
    hasMore: false,
    loadMore: jest.fn(),
    refetch: jest.fn(),
    ...patch,
  };
  logsMock.mockReturnValue(state as unknown as ReturnType<typeof useClubAdminAuditLogs>);
  renderWithProviders(<ClubPodMonitoringScreen />);
  return state;
};

beforeEach(() => jest.clearAllMocks());

describe('ClubPodMonitoringScreen', () => {
  it('titles the screen and lists each entry with its time', () => {
    mount();
    expect(screen.getByTestId('screen-title')).toHaveTextContent('mweb.meta.clubMonitoring.title');
    expect(screen.getByTestId('club-monitoring-row-a1')).toBeOnTheScreen();
    expect(screen.getByTestId('club-monitoring-row-a2')).toBeOnTheScreen();
    expect(screen.getAllByText('at 2026-10-01T10:00:00Z')).toHaveLength(2);
  });

  it('starts with an empty search, and searches the trail on the server as the admin types', () => {
    mount();
    expect(logsMock).toHaveBeenCalledWith('');
    fireEvent.changeText(screen.getByTestId('field-club-monitoring-search'), '  deleted  ');
    expect(logsMock).toHaveBeenLastCalledWith('deleted');
  });

  it('shows a spinner while loading', () => {
    mount({ rows: [], isLoading: true });
    expect(screen.getByTestId('club-monitoring-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-monitoring-empty')).toBeNull();
  });

  it('says the load failed, not that there is no activity, and retries', () => {
    const state = mount({ rows: [], hasError: true });
    expect(screen.getByTestId('club-monitoring-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-monitoring-empty')).toBeNull();
    fireEvent.press(screen.getByTestId('club-monitoring-error-retry'));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });

  it('says there is no activity once loaded empty', () => {
    mount({ rows: [] });
    expect(screen.getByTestId('club-monitoring-empty')).toHaveTextContent(
      'clubAdmin.monitoring.noActivity',
    );
  });

  it('offers more only while there is more, and loads it on tap', () => {
    const state = mount({ hasMore: true });
    fireEvent.press(screen.getByTestId('club-monitoring-more'));
    expect(state.loadMore).toHaveBeenCalledTimes(1);
  });

  it('offers no more button when everything is shown', () => {
    mount();
    expect(screen.queryByTestId('club-monitoring-more')).toBeNull();
  });

  it('opens the full entry behind a row and closes it again', async () => {
    mount({ rows: [row('a1', { ai_summary: 'Routine edit', note: 'typo' })] });
    expect(screen.queryByTestId('club-monitoring-detail-summary')).toBeNull();
    fireEvent.press(screen.getByTestId('club-monitoring-row-a1'));
    expect(await screen.findByTestId('club-monitoring-detail-summary')).toHaveTextContent(
      'Routine edit',
    );
    await act(async () => {
      fireEvent.press(screen.getAllByTestId('club-monitoring-detail-close').at(-1) as never);
    });
    expect(screen.queryByTestId('club-monitoring-detail-summary')).toBeNull();
  });
});
