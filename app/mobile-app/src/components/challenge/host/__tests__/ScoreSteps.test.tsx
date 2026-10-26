import { fireEvent, screen } from '@testing-library/react-native';

import { ScoreSteps } from '@/components/challenge/host/ScoreSteps';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { renderWithProviders } from '@/utils/test-utils';

const toolOf = (config: Record<string, unknown>) =>
  ({
    instance_id: 't1',
    label: 'Goals',
    input_kind: 'INCREMENT',
    config_json: JSON.stringify(config),
  }) as unknown as PodChallengeView['tools'][number];

const actionsOf = (busy = false) =>
  ({ busy, score: jest.fn().mockResolvedValue(true) }) as unknown as HostChallengeActions & {
    score: jest.Mock;
  };

const mount = (config: Record<string, unknown>, actions = actionsOf()) => {
  renderWithProviders(<ScoreSteps tool={toolOf(config)} competitorId="c1" actions={actions} />);
  return actions;
};

describe('ScoreSteps', () => {
  it('offers each configured step as a plus button', () => {
    mount({ increments: [1, 5] });
    expect(screen.getByText('+1')).toBeOnTheScreen();
    expect(screen.getByText('+5')).toBeOnTheScreen();
    expect(screen.queryByText('-1')).toBeNull();
  });

  it('adds the matching minus buttons when negatives are allowed', () => {
    mount({ increments: [1, 5], allow_negative: true });
    expect(screen.getAllByTestId(/^challenge-score-t1-c1-/)).toHaveLength(4);
    expect(screen.getByText('-1')).toBeOnTheScreen();
    expect(screen.getByText('-5')).toBeOnTheScreen();
  });

  it('records the step for the competitor when pressed', () => {
    const actions = mount({ increments: [2], allow_negative: true });
    fireEvent.press(screen.getByTestId('challenge-score-t1-c1-2'));
    fireEvent.press(screen.getByTestId('challenge-score-t1-c1--2'));
    expect(actions.score).toHaveBeenNthCalledWith(1, 't1', 'c1', 2);
    expect(actions.score).toHaveBeenNthCalledWith(2, 't1', 'c1', -2);
  });

  it('offers no buttons when the tool has no steps', () => {
    mount({});
    expect(screen.queryByTestId(/^challenge-score-/)).toBeNull();
  });

  it('disables the buttons while an action is in flight', () => {
    mount({ increments: [1] }, actionsOf(true));
    expect(screen.getByTestId('challenge-score-t1-c1-1')).toBeDisabled();
  });
});
