import { act, fireEvent, screen } from '@testing-library/react-native';
import { autoPodActionable, autoPodWithdrawable } from '@duncit/utils';

import { useAutoPodScreen } from '@/hooks/useAutoPodScreen';
import { ClubAutoPodsScreen } from '@/screens/ClubAutoPodsScreen';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@duncit/utils', () => ({
  ...jest.requireActual('@duncit/utils'),
  autoPodActionable: jest.fn(),
  autoPodWithdrawable: jest.fn(),
}));
jest.mock('@/hooks/useAutoPodScreen', () => ({ useAutoPodScreen: jest.fn() }));
jest.mock('@/hooks/useLocations', () => ({ useLocations: () => ({ selectedId: 'loc1' }) }));
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

const mockSeen: Record<string, Record<string, unknown>> = {};
jest.mock('@/components/auto-pods', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text, View } = require('react-native');
  return {
    AutoPodLocationRow: () => <Text testID="location-row">location</Text>,
    AutoPodQueue: (props: {
      rows: { id: string }[];
      renderAction: (row: { id: string }) => unknown;
      renderMineAction: (row: { id: string }) => unknown;
      onRetry: () => void;
      loading: boolean;
      error: boolean;
    }) => {
      mockSeen.queue = props;
      return (
        <View>
          {props.rows.map((row) => (
            <View key={row.id} testID={`row-${row.id}`}>
              {props.renderAction(row)}
              {props.renderMineAction(row)}
            </View>
          ))}
          <Pressable testID="queue-retry" onPress={props.onRetry} />
        </View>
      );
    },
    AutoPodWithdrawSheet: (props: {
      row: { id: string } | null;
      onClose: () => void;
      onWithdrawn: () => void;
    }) => {
      mockSeen.withdraw = props;
      return props.row ? (
        <View>
          <Text testID="withdraw-row">{props.row.id}</Text>
          <Pressable testID="withdraw-close" onPress={props.onClose} />
          <Pressable testID="withdraw-done" onPress={props.onWithdrawn} />
        </View>
      ) : null;
    },
    ClubClaimSheet: (props: {
      row: { id: string } | null;
      subCategoryId: string | null;
      onClose: () => void;
      onClaimed: () => void;
    }) => {
      mockSeen.claim = props;
      return props.row ? (
        <View>
          <Text testID="claim-row">{`${props.row.id}|${props.subCategoryId}`}</Text>
          <Pressable testID="claim-close" onPress={props.onClose} />
          <Pressable testID="claim-done" onPress={props.onClaimed} />
        </View>
      ) : null;
    },
  };
});

const screenMock = jest.mocked(useAutoPodScreen);
const actionable = jest.mocked(autoPodActionable);
const withdrawable = jest.mocked(autoPodWithdrawable);

const LABELS = {
  clubTitle: 'Club Auto Pods',
  viewPod: 'View pod',
  withdrawCta: 'Withdraw',
  claimForClubCta: 'Claim for my club',
};

const row = (id: string, patch: Record<string, unknown> = {}) => ({
  id,
  sub_category_id: `sub-${id}`,
  ...patch,
});

const mount = (rows: unknown[] = [row('r1')], patch: Record<string, unknown> = {}) => {
  const state = {
    labels: LABELS,
    formatWhen: jest.fn(),
    formatMoney: jest.fn(),
    rows,
    isLoading: false,
    hasError: false,
    refetch: jest.fn(),
    ...patch,
  };
  screenMock.mockReturnValue(state as unknown as ReturnType<typeof useAutoPodScreen>);
  renderWithProviders(<ClubAutoPodsScreen />);
  return state;
};

beforeEach(() => {
  jest.clearAllMocks();
  actionable.mockReturnValue(false);
  withdrawable.mockReturnValue(false);
});

describe('ClubAutoPodsScreen', () => {
  it('reads the club queue for the selected city and titles the screen', () => {
    mount();
    expect(screenMock).toHaveBeenCalledWith('club', { locationId: 'loc1' });
    expect(screen.getByTestId('screen-title')).toHaveTextContent('Club Auto Pods');
    expect(screen.getByTestId('location-row')).toBeOnTheScreen();
  });

  it('hands the queue its state and retry', () => {
    const state = mount([row('r1')], { isLoading: true, hasError: true });
    expect(mockSeen.queue).toMatchObject({ loading: true, error: true });
    fireEvent.press(screen.getByTestId('queue-retry'));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });

  it('offers no actions on a row that is not this role turn, nor already enrolled', () => {
    mount();
    expect(screen.queryByTestId('auto-pod-claim-r1')).toBeNull();
    expect(screen.queryByTestId('auto-pod-view-r1')).toBeNull();
    expect(screen.queryByTestId('auto-pod-withdraw-r1')).toBeNull();
  });

  it('offers to claim a row the club may act on, and opens the claim sheet for its category', () => {
    actionable.mockReturnValue(true);
    mount([row('r1')]);
    fireEvent.press(screen.getByTestId('auto-pod-claim-r1'));
    expect(screen.getByTestId('claim-row')).toHaveTextContent('r1|sub-r1');
  });

  it('closes the claim sheet', () => {
    actionable.mockReturnValue(true);
    mount();
    fireEvent.press(screen.getByTestId('auto-pod-claim-r1'));
    fireEvent.press(screen.getByTestId('claim-close'));
    expect(screen.queryByTestId('claim-row')).toBeNull();
  });

  it('re-reads the queue and closes the sheet once the claim went through', () => {
    actionable.mockReturnValue(true);
    const state = mount();
    fireEvent.press(screen.getByTestId('auto-pod-claim-r1'));
    fireEvent.press(screen.getByTestId('claim-done'));
    expect(screen.queryByTestId('claim-row')).toBeNull();
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the claim sheet no row when none is chosen', () => {
    mount();
    expect(mockSeen.claim).toMatchObject({ row: null, subCategoryId: null });
  });

  it('links an enrolled club to the pod that materialised', () => {
    mount([row('r1', { pod_id: 'p9', club_claim: { club_id: 'c3' } })]);
    fireEvent.press(screen.getByTestId('auto-pod-view-r1'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubPodDetails', { clubId: 'c3', podId: 'p9' });
  });

  it.each([
    ['no pod yet', { pod_id: null, club_claim: { club_id: 'c3' } }],
    ['no club claim', { pod_id: 'p9', club_claim: null }],
  ])('offers no pod link with %s', (_label, patch) => {
    mount([row('r1', patch)]);
    expect(screen.queryByTestId('auto-pod-view-r1')).toBeNull();
  });

  it('offers withdrawing a claim that can still be taken back, and opens the withdraw sheet', () => {
    withdrawable.mockReturnValue(true);
    mount();
    fireEvent.press(screen.getByTestId('auto-pod-withdraw-r1'));
    expect(screen.getByTestId('withdraw-row')).toHaveTextContent('r1');
  });

  it('closes the withdraw sheet', () => {
    withdrawable.mockReturnValue(true);
    mount();
    fireEvent.press(screen.getByTestId('auto-pod-withdraw-r1'));
    fireEvent.press(screen.getByTestId('withdraw-close'));
    expect(screen.queryByTestId('withdraw-row')).toBeNull();
  });

  it('re-reads the queue and closes the sheet once the claim was withdrawn', async () => {
    withdrawable.mockReturnValue(true);
    const state = mount();
    fireEvent.press(screen.getByTestId('auto-pod-withdraw-r1'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('withdraw-done'));
    });
    expect(screen.queryByTestId('withdraw-row')).toBeNull();
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });
});
