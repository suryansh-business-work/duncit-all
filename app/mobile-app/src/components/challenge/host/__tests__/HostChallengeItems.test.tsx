import { act, fireEvent, screen } from '@testing-library/react-native';

import { HostChallengeItems } from '@/components/challenge/host/HostChallengeItems';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});

const mockSheet = jest.fn();
jest.mock('@/components/challenge/host/CheckpointLinksSheet', () => ({
  CheckpointLinksSheet: (props: { toolInstanceId: string | null }) => {
    mockSheet(props);
    return null;
  },
}));

const ITEMS = [
  { key: 'a', label: 'Find the flag', points: 10 },
  { key: 'b', label: 'Cross the bridge', points: 20 },
];

const tool = (id: string, kind: string, label: string, done: Record<string, string[]> = {}) => ({
  instance_id: id,
  label,
  input_kind: kind,
  config_json: JSON.stringify({ items: ITEMS }),
  state_json: JSON.stringify({ done }),
});

const challengeOf = (tools: unknown[]) =>
  ({
    id: 'ch1',
    tools,
    competitors: [
      { competitor_id: 'c1', name: 'Team Red' },
      { competitor_id: 'c2', name: 'Team Blue' },
    ],
  }) as unknown as Pick<PodChallengeView, 'id' | 'tools' | 'competitors'>;

const actionsOf = (busy = false) =>
  ({ busy, item: jest.fn().mockResolvedValue(true) }) as unknown as HostChallengeActions & {
    item: jest.Mock;
  };

const mount = (tools: unknown[], actions = actionsOf()) => {
  renderWithProviders(<HostChallengeItems challenge={challengeOf(tools)} actions={actions} />);
  return actions;
};

const sheetProps = () => mockSheet.mock.calls.at(-1)?.[0];

beforeEach(() => jest.clearAllMocks());

describe('HostChallengeItems', () => {
  it('lists each competitor with every task as a toggle, marking what is done', () => {
    mount([tool('t1', 'CHECK', 'Quest', { c1: ['a'] })]);
    expect(screen.getByRole('heading', { name: 'Quest' })).toBeOnTheScreen();
    expect(screen.getByText('Team Red')).toBeOnTheScreen();
    expect(screen.getByText('Team Blue')).toBeOnTheScreen();
    const boxes = screen.getAllByRole('checkbox');
    const [redFlag, redBridge, blueFlag] = [boxes[0], boxes[1], boxes[2]];
    expect(redFlag?.props['aria-checked']).toBe(true);
    expect(redBridge?.props['aria-checked']).toBe(false);
    expect(blueFlag?.props['aria-checked']).toBe(false);
  });

  it('ticks a task that is not done', () => {
    const actions = mount([tool('t1', 'CHECK', 'Quest')]);
    fireEvent.press(screen.getAllByRole('checkbox')[0] as never);
    expect(actions.item).toHaveBeenCalledWith('t1', 'c1', 'a', true);
  });

  it('unticks a task that is done', () => {
    const actions = mount([tool('t1', 'CHECK', 'Quest', { c2: ['b'] })]);
    fireEvent.press(screen.getAllByRole('checkbox')[3] as never);
    expect(actions.item).toHaveBeenCalledWith('t1', 'c2', 'b', false);
  });

  it('ignores a tap while an action is in flight', () => {
    const actions = mount([tool('t1', 'CHECK', 'Quest')], actionsOf(true));
    fireEvent.press(screen.getAllByRole('checkbox')[0] as never);
    expect(actions.item).not.toHaveBeenCalled();
  });

  it('offers no QR button for a checklist', () => {
    mount([tool('t1', 'CHECK', 'Quest')]);
    expect(screen.queryByTestId('challenge-checkpoint-qr-t1')).toBeNull();
  });

  it('opens and closes the checkpoint links for a checkpoint tool', () => {
    mount([tool('t2', 'CHECKPOINT', 'Trail')]);
    expect(sheetProps().toolInstanceId).toBeNull();
    fireEvent.press(screen.getByTestId('challenge-checkpoint-qr-t2'));
    expect(sheetProps().toolInstanceId).toBe('t2');
    expect(sheetProps()).toMatchObject({ challengeId: 'ch1' });
    act(() => sheetProps().onClose());
    expect(sheetProps().toolInstanceId).toBeNull();
  });

  it('draws nothing for tools that are not checklists or checkpoints', () => {
    mount([tool('t3', 'POLL', 'Vote')]);
    expect(screen.queryByText('Vote')).toBeNull();
    expect(screen.queryByText('Team Red')).toBeNull();
  });
});
