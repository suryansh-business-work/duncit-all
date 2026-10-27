import { fireEvent, screen } from '@testing-library/react-native';

import { BuzzerPanel, PickPanel } from '@/components/challenge/tools/BuzzerPanel';
import type { PanelProps } from '@/components/challenge/tools/ToolCard';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});

const COMPETITORS = [
  { competitor_id: 'c1', name: 'Team Red' },
  { competitor_id: 'c2', name: 'Team Blue' },
];

const buzzTool = (patch: Record<string, unknown> = {}, state: Record<string, unknown> = {}) =>
  ({
    instance_id: 'b1',
    label: 'Buzzer',
    input_kind: 'BUZZ',
    voting_open: true,
    config_json: '{}',
    state_json: JSON.stringify({ round: 3, ...state }),
    ...patch,
  }) as unknown as PanelProps['tool'];

const challengeOf = (viewer: Record<string, unknown> = {}) =>
  ({
    id: 'ch1',
    status: 'LIVE',
    competitors: COMPETITORS,
    viewer: { my_competitor_id: 'c1', my_votes: [], ...viewer },
  }) as unknown as PanelProps['challenge'];

const actionsOf = (busy = false) =>
  ({ busy, buzz: jest.fn().mockResolvedValue(true) }) as unknown as PanelProps['actions'] & {
    buzz: jest.Mock;
  };

const mountBuzzer = (tool = buzzTool(), challenge = challengeOf(), actions = actionsOf()) => {
  renderWithProviders(<BuzzerPanel challenge={challenge} tool={tool} actions={actions} />);
  return actions;
};

describe('BuzzerPanel', () => {
  it('lets a competitor buzz while the buzzer is armed', () => {
    const actions = mountBuzzer();
    expect(screen.getByText('mweb.challenge.tools.buzzArmed')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.buzz')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('challenge-buzz-b1'));
    expect(actions.buzz).toHaveBeenCalledWith('b1');
  });

  it('shows waiting and disables the button while the buzzer is not armed', () => {
    mountBuzzer(buzzTool({ voting_open: false }));
    expect(screen.getByText('mweb.challenge.tools.buzzWaiting')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-buzz-b1')).toBeDisabled();
  });

  it('marks a competitor who already buzzed this round and blocks a second buzz', () => {
    mountBuzzer(
      buzzTool(),
      challengeOf({ my_votes: [{ tool_instance_id: 'b1', kind: 'BUZZ', scope_key: 'r3' }] }),
    );
    expect(screen.getByText('mweb.challenge.tools.buzzed')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-buzz-b1')).toBeDisabled();
  });

  it('lets a competitor buzz again in a new round, ignoring buzzes of other rounds and tools', () => {
    mountBuzzer(
      buzzTool(),
      challengeOf({
        my_votes: [
          { tool_instance_id: 'b1', kind: 'BUZZ', scope_key: 'r2' },
          { tool_instance_id: 'other', kind: 'BUZZ', scope_key: 'r3' },
          { tool_instance_id: 'b1', kind: 'POLL', scope_key: 'r3' },
        ],
      }),
    );
    expect(screen.getByText('mweb.challenge.tools.buzz')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-buzz-b1')).toBeEnabled();
  });

  it('disables the button while an action is in flight', () => {
    mountBuzzer(buzzTool(), challengeOf(), actionsOf(true));
    expect(screen.getByTestId('challenge-buzz-b1')).toBeDisabled();
  });

  it('tells a spectator that only competitors buzz', () => {
    mountBuzzer(buzzTool(), challengeOf({ my_competitor_id: null }));
    expect(screen.getByText('mweb.challenge.tools.competitorsOnly')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-buzz-b1')).toBeNull();
  });

  it('lists the buzz order, fastest first, with a blank name for a competitor who left', () => {
    mountBuzzer(buzzTool({}, { order: ['c2', 'gone', 'c1'] }));
    expect(screen.getByText('mweb.challenge.tools.place|1,Team Blue')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.place|2,')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.place|3,Team Red')).toBeOnTheScreen();
    expect(screen.queryByText('mweb.challenge.tools.buzzNobody')).toBeNull();
  });

  it('says nobody has buzzed when the order is empty', () => {
    mountBuzzer();
    expect(screen.getByText('mweb.challenge.tools.buzzNobody')).toBeOnTheScreen();
  });
});

describe('PickPanel', () => {
  const pickTool = (picked?: string[]) =>
    ({
      instance_id: 'p1',
      label: 'Picker',
      input_kind: 'PICK',
      voting_open: false,
      config_json: '{}',
      state_json: JSON.stringify(picked ? { picked } : {}),
    }) as unknown as PanelProps['tool'];
  const mountPick = (tool: PanelProps['tool']) =>
    renderWithProviders(<PickPanel challenge={challengeOf()} tool={tool} />);

  it('says nobody has been picked yet', () => {
    mountPick(pickTool());
    expect(screen.getByText('mweb.challenge.tools.pickNone')).toBeOnTheScreen();
    expect(screen.queryByText('mweb.challenge.tools.pickEarlier')).toBeNull();
  });

  it('shows the latest pick alone when there is only one', () => {
    mountPick(pickTool(['c1']));
    expect(screen.getByText('mweb.challenge.tools.pickLatest|Team Red')).toBeOnTheScreen();
    expect(screen.queryByText('mweb.challenge.tools.pickEarlier')).toBeNull();
  });

  it('numbers earlier draws, including a competitor drawn twice, and blanks one who left', () => {
    mountPick(pickTool(['c1', 'gone', 'c2', 'c1']));
    expect(screen.getByText('mweb.challenge.tools.pickLatest|Team Red')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.pickEarlier')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.place|1,Team Red')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.place|2,')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.place|3,Team Blue')).toBeOnTheScreen();
  });

  it('shows a blank name when the only pick has left the roster', () => {
    mountPick(pickTool(['gone']));
    expect(screen.getByText('mweb.challenge.tools.pickLatest|')).toBeOnTheScreen();
  });
});
