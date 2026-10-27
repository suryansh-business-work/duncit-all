import { fireEvent, screen } from '@testing-library/react-native';

import { HostChallengeLive } from '@/components/challenge/host/HostChallengeLive';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});

// Each child has its own tests; here they are stubs that expose what they were given.
jest.mock('@/components/challenge/ChallengeClock', () => ({
  ChallengeClock: ({ tool, receivedAt }: { tool: { instance_id: string }; receivedAt: number }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID={`clock-${tool.instance_id}`}>{`clock@${receivedAt}`}</Text>;
  },
}));
jest.mock('@/components/challenge/host/HostChallengeTools', () => ({
  HostChallengeTools: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="stub-tools">tools</Text>;
  },
}));
jest.mock('@/components/challenge/host/HostChallengeItems', () => ({
  HostChallengeItems: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="stub-items">items</Text>;
  },
}));
jest.mock('@/components/challenge/host/ScoreSteps', () => ({
  ScoreSteps: ({ tool, competitorId }: { tool: { instance_id: string }; competitorId: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID={`steps-${tool.instance_id}-${competitorId}`}>steps</Text>;
  },
}));
jest.mock('@/components/challenge/host/ValueEntry', () => ({
  ValueEntry: ({ tool, competitorId }: { tool: { instance_id: string }; competitorId: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID={`value-${tool.instance_id}-${competitorId}`}>value</Text>;
  },
}));

type Tool = Record<string, unknown>;
const tool = (patch: Tool): Tool => ({
  instance_id: 't',
  label: 'Tool',
  input_kind: 'CLOCK',
  config_json: '{}',
  clock_running: false,
  voting_open: false,
  ...patch,
});

const challengeOf = (patch: Record<string, unknown> = {}) =>
  ({
    status: 'LIVE',
    current_round: 1,
    competitors: [
      { competitor_id: 'c1', name: 'Team Red' },
      { competitor_id: 'c2', name: 'Team Blue' },
    ],
    standings: [{ competitor_id: 'c1', metrics_json: JSON.stringify({ pts: 7 }) }],
    tools: [],
    ...patch,
  }) as unknown as PodChallengeView;

const actionsOf = (busy = false) =>
  ({
    busy,
    clock: jest.fn().mockResolvedValue(true),
    voting: jest.fn().mockResolvedValue(true),
    round: jest.fn().mockResolvedValue(true),
  }) as unknown as HostChallengeActions & {
    clock: jest.Mock;
    voting: jest.Mock;
    round: jest.Mock;
  };

const mount = (challenge: PodChallengeView, actions = actionsOf()) => {
  renderWithProviders(
    <HostChallengeLive challenge={challenge} receivedAt={1234} actions={actions} />,
  );
  return actions;
};

describe('HostChallengeLive — clocks', () => {
  it('shows a clock per clock tool, fed the time the answer arrived', () => {
    mount(challengeOf({ tools: [tool({ instance_id: 'k1' })] }));
    expect(screen.getByTestId('clock-k1')).toHaveTextContent('clock@1234');
  });

  it('starts a stopped clock, and only stop and start are offered the right way round', () => {
    const actions = mount(challengeOf({ tools: [tool({ instance_id: 'k1' })] }));
    expect(screen.getByTestId('challenge-clock-start-k1')).toBeEnabled();
    expect(screen.getByTestId('challenge-clock-stop-k1')).toBeDisabled();
    expect(screen.getByTestId('challenge-clock-reset-k1')).toBeEnabled();
    fireEvent.press(screen.getByTestId('challenge-clock-start-k1'));
    fireEvent.press(screen.getByTestId('challenge-clock-reset-k1'));
    expect(actions.clock).toHaveBeenNthCalledWith(1, 'k1', 'START');
    expect(actions.clock).toHaveBeenNthCalledWith(2, 'k1', 'RESET');
  });

  it('stops a running clock and blocks start and reset meanwhile', () => {
    const actions = mount(
      challengeOf({ tools: [tool({ instance_id: 'k1', clock_running: true })] }),
    );
    expect(screen.getByTestId('challenge-clock-start-k1')).toBeDisabled();
    expect(screen.getByTestId('challenge-clock-reset-k1')).toBeDisabled();
    fireEvent.press(screen.getByTestId('challenge-clock-stop-k1'));
    expect(actions.clock).toHaveBeenCalledWith('k1', 'STOP');
  });

  it('will not start a clock before the challenge is live', () => {
    mount(challengeOf({ status: 'SCHEDULED', tools: [tool({ instance_id: 'k1' })] }));
    expect(screen.getByTestId('challenge-clock-start-k1')).toBeDisabled();
  });

  it('disables every clock button while an action is in flight', () => {
    mount(
      challengeOf({ tools: [tool({ instance_id: 'k1', clock_running: true })] }),
      actionsOf(true),
    );
    expect(screen.getByTestId('challenge-clock-stop-k1')).toBeDisabled();
  });
});

describe('HostChallengeLive — voting windows', () => {
  it.each(['VOTE', 'RATE', 'POLL'])('lists a %s tool with its window state', (kind) => {
    mount(
      challengeOf({
        tools: [tool({ instance_id: 'v', input_kind: kind, label: 'Fave', voting_open: true })],
      }),
    );
    expect(screen.getByText(/Fave/)).toHaveTextContent('Fave · mweb.challenge.votingOpen');
    expect(screen.getByText('mweb.challenge.closeVoting')).toBeOnTheScreen();
  });

  it('closes an open window', () => {
    const actions = mount(
      challengeOf({ tools: [tool({ instance_id: 'v', input_kind: 'VOTE', voting_open: true })] }),
    );
    fireEvent.press(screen.getByTestId('challenge-voting-v'));
    expect(actions.voting).toHaveBeenCalledWith('v', false);
  });

  it('opens a closed window while the challenge is live', () => {
    const actions = mount(
      challengeOf({ tools: [tool({ instance_id: 'v', input_kind: 'VOTE', label: 'Fave' })] }),
    );
    expect(screen.getByText(/Fave/)).toHaveTextContent('Fave · mweb.challenge.votingClosedShort');
    expect(screen.getByTestId('challenge-voting-v')).toBeEnabled();
    fireEvent.press(screen.getByTestId('challenge-voting-v'));
    expect(actions.voting).toHaveBeenCalledWith('v', true);
  });

  it('will not open a window before the challenge is live, but can still close one', () => {
    mount(
      challengeOf({
        status: 'PAUSED',
        tools: [
          tool({ instance_id: 'closed', input_kind: 'VOTE' }),
          tool({ instance_id: 'open', input_kind: 'VOTE', voting_open: true }),
        ],
      }),
    );
    expect(screen.getByTestId('challenge-voting-closed')).toBeDisabled();
    expect(screen.getByTestId('challenge-voting-open')).toBeEnabled();
  });

  it('disables the window button while an action is in flight', () => {
    mount(
      challengeOf({ tools: [tool({ instance_id: 'v', input_kind: 'VOTE', voting_open: true })] }),
      actionsOf(true),
    );
    expect(screen.getByTestId('challenge-voting-v')).toBeDisabled();
  });
});

describe('HostChallengeLive — tools, items and rounds', () => {
  it('always shows the tool controls, but the items only while live', () => {
    mount(challengeOf());
    expect(screen.getByTestId('stub-tools')).toBeOnTheScreen();
    expect(screen.getByTestId('stub-items')).toBeOnTheScreen();
  });

  it('hides the items when the challenge is not live', () => {
    mount(challengeOf({ status: 'COMPLETED' }));
    expect(screen.getByTestId('stub-tools')).toBeOnTheScreen();
    expect(screen.queryByTestId('stub-items')).toBeNull();
  });

  it('shows no round controls without a round tool', () => {
    mount(challengeOf());
    expect(screen.queryByTestId('challenge-round-next')).toBeNull();
  });

  it('steps between rounds within the tool total', () => {
    const actions = mount(
      challengeOf({
        current_round: 2,
        tools: [
          tool({
            instance_id: 'r',
            input_kind: 'ROUND',
            config_json: JSON.stringify({ rounds: 4 }),
          }),
        ],
      }),
    );
    expect(screen.getByText('mweb.challenge.roundOf|2,4')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('challenge-round-prev'));
    fireEvent.press(screen.getByTestId('challenge-round-next'));
    expect(actions.round).toHaveBeenNthCalledWith(1, 1);
    expect(actions.round).toHaveBeenNthCalledWith(2, 3);
  });

  it('disables previous on the first round and next on the last', () => {
    const roundTool = tool({
      instance_id: 'r',
      input_kind: 'ROUND',
      config_json: JSON.stringify({ rounds: 3 }),
    });
    const { unmount } = renderWithProviders(
      <HostChallengeLive
        challenge={challengeOf({ current_round: 1, tools: [roundTool] })}
        receivedAt={1}
        actions={actionsOf()}
      />,
    );
    expect(screen.getByTestId('challenge-round-prev')).toBeDisabled();
    expect(screen.getByTestId('challenge-round-next')).toBeEnabled();
    unmount();
    renderWithProviders(
      <HostChallengeLive
        challenge={challengeOf({ current_round: 3, tools: [roundTool] })}
        receivedAt={1}
        actions={actionsOf()}
      />,
    );
    expect(screen.getByTestId('challenge-round-prev')).toBeEnabled();
    expect(screen.getByTestId('challenge-round-next')).toBeDisabled();
  });

  it('treats a round tool with no configured total as a single round', () => {
    mount(challengeOf({ tools: [tool({ instance_id: 'r', input_kind: 'ROUND' })] }));
    expect(screen.getByText('mweb.challenge.roundOf|1,1')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-round-prev')).toBeDisabled();
    expect(screen.getByTestId('challenge-round-next')).toBeDisabled();
  });

  it('disables the round buttons while an action is in flight', () => {
    mount(
      challengeOf({
        current_round: 2,
        tools: [
          tool({
            instance_id: 'r',
            input_kind: 'ROUND',
            config_json: JSON.stringify({ rounds: 4 }),
          }),
        ],
      }),
      actionsOf(true),
    );
    expect(screen.getByTestId('challenge-round-prev')).toBeDisabled();
    expect(screen.getByTestId('challenge-round-next')).toBeDisabled();
  });
});

describe('HostChallengeLive — live score entry', () => {
  const scoring = [
    tool({ instance_id: 'inc', input_kind: 'INCREMENT', label: 'Goals', config_json: '{}' }),
    tool({ instance_id: 'val', input_kind: 'SET_VALUE', label: 'Distance' }),
  ];

  it('lists each scorable tool per competitor with the server metric, or a dash when there is none', () => {
    mount(
      challengeOf({
        tools: scoring,
        standings: [{ competitor_id: 'c1', metrics_json: JSON.stringify({ inc: 7 }) }],
      }),
    );
    expect(screen.getByText('Goals')).toBeOnTheScreen();
    expect(screen.getByText('Distance')).toBeOnTheScreen();
    expect(screen.getAllByText('Team Red · 7')).toHaveLength(1);
    expect(screen.getAllByText('Team Blue · —')).toHaveLength(2);
    expect(screen.getByText('Team Red · —')).toBeOnTheScreen();
  });

  it('feeds an increment tool with steps and a value tool with a value box', () => {
    mount(challengeOf({ tools: scoring }));
    expect(screen.getByTestId('steps-inc-c1')).toBeOnTheScreen();
    expect(screen.getByTestId('steps-inc-c2')).toBeOnTheScreen();
    expect(screen.getByTestId('value-val-c1')).toBeOnTheScreen();
    expect(screen.queryByTestId('value-inc-c1')).toBeNull();
    expect(screen.queryByTestId('steps-val-c1')).toBeNull();
  });

  it('scores a clock only when it records competitor times', () => {
    mount(
      challengeOf({
        tools: [
          tool({
            instance_id: 'timed',
            label: 'Lap',
            config_json: JSON.stringify({ record_competitor_times: true }),
          }),
          tool({
            instance_id: 'plain',
            label: 'Warm-up',
            config_json: JSON.stringify({ record_competitor_times: false }),
          }),
        ],
      }),
    );
    expect(screen.getByTestId('value-timed-c1')).toBeOnTheScreen();
    expect(screen.queryByTestId('value-plain-c1')).toBeNull();
    expect(screen.queryByText('Warm-up')).toBeNull();
  });

  it('offers no score entry unless the challenge is live', () => {
    mount(challengeOf({ status: 'PAUSED', tools: scoring }));
    expect(screen.queryByText('Goals')).toBeNull();
    expect(screen.queryByTestId('steps-inc-c1')).toBeNull();
  });
});
