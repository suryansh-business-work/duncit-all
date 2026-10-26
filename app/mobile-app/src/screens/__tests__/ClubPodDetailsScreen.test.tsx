import { fireEvent, screen } from '@testing-library/react-native';

import { useClubPodDetail } from '@/hooks/useClubPodDetail';
import { ClubPodDetailsScreen } from '@/screens/ClubPodDetailsScreen/ClubPodDetailsScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: { clubId: 'c1', podId: 'p1' } }),
}));
jest.mock('@/hooks/useClubPodDetail', () => ({ useClubPodDetail: jest.fn() }));
jest.mock('@/components/StackScreen', () => ({
  StackScreen: ({
    title,
    testID,
    right,
    children,
  }: {
    title: string;
    testID: string;
    right: unknown;
    children: unknown;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text, View } = require('react-native');
    return (
      <View testID={testID}>
        <Text testID="screen-title">{title}</Text>
        {right}
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

const mockSeen: Record<string, Record<string, unknown>> = {};
jest.mock('@/components/club-admin/pod-details', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text, View } = require('react-native');
  const stub = (name: string) =>
    function Stub(props: Record<string, unknown>) {
      mockSeen[name] = props;
      return <Text testID={`stub-${name}`}>{name}</Text>;
    };
  return {
    PodDetailOverview: stub('overview'),
    PodDetailTimeline: stub('timeline'),
    PodDetailHosts: stub('hosts'),
    PodDetailClub: stub('club'),
    PodDetailFeedback: stub('feedback'),
    PodDetailAttendees: stub('attendees'),
    PodDetailPayments: stub('payments'),
    PodDetailSection: ({
      title,
      testID,
      children,
    }: {
      title: string;
      testID: string;
      children: unknown;
    }) => (
      <View testID={testID}>
        <Text>{title}</Text>
        {children}
      </View>
    ),
  };
});

const detailMock = jest.mocked(useClubPodDetail);

const POD = {
  id: 'p1',
  pod_title: 'Sunday Smash',
  pod_date_time: '2030-01-06T10:00:00Z',
  club: { club_id: 'smash' },
};

const mount = (patch: Record<string, unknown> = {}) => {
  const state = {
    pod: POD,
    attendees: [{ user_id: 'u1' }],
    hosts: [{ userId: 'h1' }],
    isLoading: false,
    hasError: false,
    refetch: jest.fn(),
    ...patch,
  };
  detailMock.mockReturnValue(state as unknown as ReturnType<typeof useClubPodDetail>);
  renderWithProviders(<ClubPodDetailsScreen />);
  return state;
};

beforeEach(() => jest.clearAllMocks());

describe('ClubPodDetailsScreen', () => {
  it('reads the pod of the route and titles the screen with its name', () => {
    mount();
    expect(detailMock).toHaveBeenCalledWith('p1');
    expect(screen.getByTestId('screen-title')).toHaveTextContent('Sunday Smash');
  });

  it('titles the screen generically while there is no pod yet', () => {
    mount({ pod: null, isLoading: true });
    expect(screen.getByTestId('screen-title')).toHaveTextContent('clubAdmin.pods.podDetails');
  });

  it('offers editing from the header', () => {
    mount();
    fireEvent.press(screen.getByTestId('club-pod-detail-edit'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubPodEdit', { clubId: 'c1', podId: 'p1' });
  });

  it('draws every section of the pod, handing each what it needs', () => {
    const state = mount();
    for (const name of [
      'overview',
      'timeline',
      'hosts',
      'club',
      'feedback',
      'attendees',
      'payments',
    ]) {
      expect(screen.getByTestId(`stub-${name}`)).toBeOnTheScreen();
    }
    expect(mockSeen.overview?.pod).toBe(POD);
    expect(mockSeen.hosts?.hosts).toBe(state.hosts);
    expect(mockSeen.club?.club).toBe(POD.club);
    expect(mockSeen.feedback?.podId).toBe('p1');
    expect(mockSeen.payments?.podId).toBe('p1');
    expect(mockSeen.attendees).toMatchObject({
      rows: state.attendees,
      podDateTime: '2030-01-06T10:00:00Z',
      isLoading: false,
    });
  });

  it('hands the club section no club for a pod with none', () => {
    mount({ pod: { ...POD, club: undefined } });
    expect(mockSeen.club?.club).toBeNull();
  });

  it('links to the attendance board rather than drawing a second roster', () => {
    mount();
    fireEvent.press(screen.getByTestId('club-pod-detail-attendance-link'));
    expect(mockNavigate).toHaveBeenCalledWith('PodAttendance', { podId: 'p1' });
  });

  it('shows a spinner while the first load runs, and no sections', () => {
    mount({ pod: null, isLoading: true });
    expect(screen.getByTestId('club-pod-details-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('stub-overview')).toBeNull();
    expect(screen.queryByTestId('club-pod-details-missing')).toBeNull();
  });

  it('shows no spinner while a reload runs over a pod already on screen', () => {
    mount({ isLoading: true });
    expect(screen.queryByTestId('club-pod-details-loading')).toBeNull();
    expect(screen.getByTestId('stub-overview')).toBeOnTheScreen();
  });

  it('says the load failed, not that the pod is missing, and retries', () => {
    const state = mount({ pod: null, hasError: true });
    expect(screen.getByTestId('club-pod-details-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('club-pod-details-missing')).toBeNull();
    fireEvent.press(screen.getByTestId('club-pod-details-error-retry'));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });

  it('says the pod was not found once loaded without one', () => {
    mount({ pod: null });
    expect(screen.getByTestId('club-pod-details-missing')).toHaveTextContent(
      'clubAdmin.editor.notFound',
    );
  });
});
