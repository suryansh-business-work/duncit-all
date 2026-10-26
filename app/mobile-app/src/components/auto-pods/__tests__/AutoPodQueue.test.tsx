import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { AutoPodQueue } from '@/components/auto-pods/AutoPodQueue';
import {
  autoPodTestLabels as labels,
  hostClaim,
  makeAutoPodRow,
  venueClaim,
} from '@/utils/auto-pod-fixture';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/components/auto-pods/AutoPodCard', () => ({
  AutoPodCard: ({
    row,
    action,
    earningsAction,
    earnings,
  }: {
    row: { id: string };
    action: unknown;
    earningsAction: unknown;
    earnings: number | null;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text: RNText, View } = require('react-native');
    return (
      <View testID={`card-${row.id}`}>
        <RNText testID={`earn-${row.id}`}>{String(earnings)}</RNText>
        {action}
        {earningsAction}
      </View>
    );
  },
}));

const chrome = {
  role: 'venue' as const,
  labels,
  formatWhen: (iso: string) => iso,
  formatMoney: (amount: number) => `${amount}`,
};

// Venue's turn: nothing claimed. A row the venue already took is "mine".
const open = makeAutoPodRow({ id: 'open1' });
const taken = makeAutoPodRow({ id: 'mine1', venue_claim: venueClaim, viewer_claimed: true });

const mount = (props: Partial<React.ComponentProps<typeof AutoPodQueue>> = {}) =>
  renderWithProviders(
    <AutoPodQueue
      {...chrome}
      rows={[]}
      loading={false}
      error={false}
      onRetry={jest.fn()}
      renderAction={(row) => <Text testID={`act-${row.id}`}>act</Text>}
      {...props}
    />,
  );

describe('AutoPodQueue', () => {
  it('shows only the spinner while loading, even with rows and an error', () => {
    mount({ loading: true, error: true, rows: [open] });
    expect(screen.getByLabelText(/Loading/)).toBeOnTheScreen();
    expect(screen.queryByTestId('auto-pods-error')).toBeNull();
    expect(screen.queryByTestId('card-open1')).toBeNull();
  });

  it('says the load failed and retries on request', () => {
    const onRetry = jest.fn();
    mount({ error: true, onRetry, rows: [open] });
    expect(screen.getByTestId('auto-pods-error')).toHaveTextContent(labels.loadFailed);
    expect(screen.queryByTestId('card-open1')).toBeNull();
    fireEvent.press(screen.getByTestId('auto-pods-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('says the queue is empty for the role when nothing is actionable or taken', () => {
    mount({ rows: [] });
    expect(screen.getByTestId('auto-pods-empty')).toHaveTextContent(labels.empty('venue'));
  });

  it('treats rows that are neither actionable nor taken as an empty queue', () => {
    // The host is next on this row, so the venue can neither act nor has it taken.
    mount({ rows: [makeAutoPodRow({ id: 'x', venue_claim: venueClaim })] });
    expect(screen.getByTestId('auto-pods-empty')).toBeOnTheScreen();
  });

  it('puts actionable rows under the needs-action heading with the role button', () => {
    mount({ rows: [open] });
    expect(screen.getByText(labels.needsAction)).toBeOnTheScreen();
    expect(screen.getByTestId('act-open1')).toBeOnTheScreen();
    expect(screen.queryByText(labels.assignedHeading('venue'))).toBeNull();
  });

  it('puts enrolled rows in their own section, with the mine action when given', () => {
    mount({
      rows: [open, taken],
      renderMineAction: (row) => <Text testID={`mine-${row.id}`}>mine</Text>,
    });
    expect(screen.getByText(labels.assignedHeading('venue'))).toBeOnTheScreen();
    expect(screen.getByTestId('mine-mine1')).toBeOnTheScreen();
    expect(screen.queryByTestId('act-mine1')).toBeNull();
    expect(screen.queryByTestId('mine-open1')).toBeNull();
  });

  it('draws no action on an enrolled row when there is no mine action', () => {
    mount({ rows: [taken] });
    expect(screen.getByTestId('card-mine1')).toBeOnTheScreen();
    expect(screen.queryByTestId('act-mine1')).toBeNull();
  });

  it('hands each card the viewer own earnings figure, or null when there is none', () => {
    mount({
      rows: [open, makeAutoPodRow({ id: 'open2' })],
      earnings: { open1: 450 },
      renderEarningsAction: (row) => <Text testID={`calc-${row.id}`}>calc</Text>,
    });
    expect(screen.getByTestId('earn-open1')).toHaveTextContent('450');
    expect(screen.getByTestId('earn-open2')).toHaveTextContent('null');
    expect(screen.getByTestId('calc-open1')).toBeOnTheScreen();
  });

  it('defaults to no figures and no earnings control', () => {
    mount({ rows: [open] });
    expect(screen.getByTestId('earn-open1')).toHaveTextContent('null');
    expect(screen.queryByTestId('calc-open1')).toBeNull();
  });

  it('follows the role: the host sees the row once the venue has enrolled', () => {
    const afterVenue = makeAutoPodRow({ id: 'h1row', venue_claim: venueClaim });
    mount({ role: 'host', rows: [afterVenue] });
    expect(screen.getByTestId('act-h1row')).toBeOnTheScreen();
    expect(hostClaim.user_id).toBe('h1');
  });
});
