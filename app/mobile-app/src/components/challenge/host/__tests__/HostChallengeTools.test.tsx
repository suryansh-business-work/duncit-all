import { fireEvent, screen } from '@testing-library/react-native';

import { HostChallengeTools } from '@/components/challenge/host/HostChallengeTools';
import type { HostChallengeActions } from '@/hooks/useHostChallengeActions';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
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

const QUESTIONS = [
  { key: 'q1', label: 'Capital of France?', options: ['Rome', 'Paris'], points: 5, correct: 1 },
  { key: 'q2', label: 'Opinion?', options: ['Yes', 'No'], points: 1 },
  { key: 'q3', label: 'Stale key?', options: ['A'], points: 1, correct: 7 },
];

const quiz = (patch: Record<string, unknown> = {}, state: Record<string, unknown> = {}) => ({
  instance_id: 'quiz1',
  label: 'Quiz',
  input_kind: 'QUIZ',
  voting_open: false,
  config_json: JSON.stringify({ questions: QUESTIONS }),
  state_json: JSON.stringify({ answered: { q1: 2 }, ...state }),
  ...patch,
});
const buzzer = (patch: Record<string, unknown> = {}, state: Record<string, unknown> = {}) => ({
  instance_id: 'buzz1',
  label: 'Buzzer',
  input_kind: 'BUZZ',
  voting_open: false,
  config_json: '{}',
  state_json: JSON.stringify(state),
  ...patch,
});
const picker = (state: Record<string, unknown> = {}) => ({
  instance_id: 'pick1',
  label: 'Picker',
  input_kind: 'PICK',
  voting_open: false,
  config_json: '{}',
  state_json: JSON.stringify(state),
});

const actionsOf = (busy = false) =>
  ({
    busy,
    quiz: jest.fn().mockResolvedValue(true),
    buzzer: jest.fn().mockResolvedValue(true),
    pick: jest.fn().mockResolvedValue(true),
  }) as unknown as HostChallengeActions & { quiz: jest.Mock; buzzer: jest.Mock; pick: jest.Mock };

const mount = (tools: unknown[], status = 'LIVE', actions = actionsOf()) => {
  const challenge = { status, tools, competitors: COMPETITORS } as unknown as PodChallengeView;
  renderWithProviders(<HostChallengeTools challenge={challenge} actions={actions} />);
  return actions;
};

describe('HostChallengeTools — quiz desk', () => {
  it('lists each question with its right answer and answer count', () => {
    mount([quiz()]);
    expect(screen.getByText('Quiz')).toBeOnTheScreen();
    expect(screen.getByText('Capital of France?')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.quizDesk|Paris,2')).toBeOnTheScreen();
    // No correct answer (q2) and a correct index with no such option (q3) both read as blank,
    // never "undefined"; neither has answers yet.
    expect(screen.getAllByText('mweb.challenge.tools.quizDesk|,0')).toHaveLength(2);
  });

  it('opens a question while the challenge is live', () => {
    const actions = mount([quiz()]);
    expect(screen.getByTestId('challenge-quiz-open-q1')).toBeEnabled();
    fireEvent.press(screen.getByTestId('challenge-quiz-open-q2'));
    expect(actions.quiz).toHaveBeenCalledWith('quiz1', 'q2');
    expect(screen.queryByTestId('challenge-quiz-close-q1')).toBeNull();
  });

  it('offers closing for the open question only, and opening for the rest', () => {
    const actions = mount([quiz({ voting_open: true }, { active: 'q1' })]);
    expect(screen.getByTestId('challenge-quiz-close-q1')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-quiz-open-q1')).toBeNull();
    expect(screen.getByTestId('challenge-quiz-open-q2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('challenge-quiz-close-q1'));
    expect(actions.quiz).toHaveBeenCalledWith('quiz1', null);
  });

  it('treats a question left active after answers closed as not open', () => {
    mount([quiz({ voting_open: false }, { active: 'q1' })]);
    expect(screen.queryByTestId('challenge-quiz-close-q1')).toBeNull();
    expect(screen.getByTestId('challenge-quiz-open-q1')).toBeOnTheScreen();
  });

  it('will not open a question before the challenge is live', () => {
    mount([quiz()], 'SCHEDULED');
    expect(screen.getByTestId('challenge-quiz-open-q1')).toBeDisabled();
  });

  it('disables open and close while an action is in flight', () => {
    mount([quiz({ voting_open: true }, { active: 'q1' })], 'LIVE', actionsOf(true));
    expect(screen.getByTestId('challenge-quiz-close-q1')).toBeDisabled();
    expect(screen.getByTestId('challenge-quiz-open-q2')).toBeDisabled();
  });
});

describe('HostChallengeTools — buzzer', () => {
  it('names the first to buzz', () => {
    mount([buzzer({}, { order: ['c2', 'c1'] })]);
    expect(screen.getByText(/Buzzer/)).toHaveTextContent(
      'Buzzer · mweb.challenge.tools.buzzFirst|Team Blue',
    );
  });

  it('shows a blank name for a buzzer that is no longer on the roster', () => {
    mount([buzzer({}, { order: ['gone'] })]);
    expect(screen.getByText(/Buzzer/)).toHaveTextContent(
      'Buzzer · mweb.challenge.tools.buzzFirst|',
    );
  });

  it('says nobody has buzzed yet', () => {
    mount([buzzer()]);
    expect(screen.getByText(/Buzzer/)).toHaveTextContent(
      'Buzzer · mweb.challenge.tools.buzzNobody',
    );
  });

  it('arms a disarmed buzzer; disarm is unavailable until it is armed', () => {
    const actions = mount([buzzer()]);
    expect(screen.getByText('mweb.challenge.tools.buzzerArm')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-buzzer-disarm-buzz1')).toBeDisabled();
    fireEvent.press(screen.getByTestId('challenge-buzzer-arm-buzz1'));
    expect(actions.buzzer).toHaveBeenCalledWith('buzz1', true);
  });

  it('starts the next round on an armed buzzer and can disarm it', () => {
    const actions = mount([buzzer({ voting_open: true })]);
    expect(screen.getByText('mweb.challenge.tools.buzzerNext')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-buzzer-disarm-buzz1')).toBeEnabled();
    fireEvent.press(screen.getByTestId('challenge-buzzer-disarm-buzz1'));
    expect(actions.buzzer).toHaveBeenCalledWith('buzz1', false);
  });

  it('will not arm before the challenge is live', () => {
    mount([buzzer()], 'PAUSED');
    expect(screen.getByTestId('challenge-buzzer-arm-buzz1')).toBeDisabled();
  });

  it('disables both buttons while an action is in flight', () => {
    mount([buzzer({ voting_open: true })], 'LIVE', actionsOf(true));
    expect(screen.getByTestId('challenge-buzzer-arm-buzz1')).toBeDisabled();
    expect(screen.getByTestId('challenge-buzzer-disarm-buzz1')).toBeDisabled();
  });
});

describe('HostChallengeTools — random picker', () => {
  it('names the latest competitor drawn', () => {
    mount([picker({ picked: ['c1', 'c2'] })]);
    expect(screen.getByText(/Picker/)).toHaveTextContent(
      'Picker · mweb.challenge.tools.pickLatest|Team Blue',
    );
  });

  it('shows a blank name for a drawn competitor that left the roster', () => {
    mount([picker({ picked: ['gone'] })]);
    expect(screen.getByText(/Picker/)).toHaveTextContent(
      'Picker · mweb.challenge.tools.pickLatest|',
    );
  });

  it('says nobody has been drawn and has nothing to reset', () => {
    const actions = mount([picker()]);
    expect(screen.getByText(/Picker/)).toHaveTextContent('Picker · mweb.challenge.tools.pickNone');
    expect(screen.getByTestId('challenge-pick-reset-pick1')).toBeDisabled();
    fireEvent.press(screen.getByTestId('challenge-pick-draw-pick1'));
    expect(actions.pick).toHaveBeenCalledWith('pick1', false);
  });

  it('resets once somebody has been drawn', () => {
    const actions = mount([picker({ picked: ['c1'] })]);
    expect(screen.getByTestId('challenge-pick-reset-pick1')).toBeEnabled();
    fireEvent.press(screen.getByTestId('challenge-pick-reset-pick1'));
    expect(actions.pick).toHaveBeenCalledWith('pick1', true);
  });

  it('disables drawing and resetting while an action is in flight', () => {
    mount([picker({ picked: ['c1'] })], 'LIVE', actionsOf(true));
    expect(screen.getByTestId('challenge-pick-draw-pick1')).toBeDisabled();
    expect(screen.getByTestId('challenge-pick-reset-pick1')).toBeDisabled();
  });

  it('can draw even when the challenge is not live', () => {
    mount([picker()], 'COMPLETED');
    expect(screen.getByTestId('challenge-pick-draw-pick1')).toBeEnabled();
  });
});

describe('HostChallengeTools — other tools', () => {
  it('draws nothing for tools it does not run', () => {
    mount([
      {
        instance_id: 'x',
        label: 'Clock',
        input_kind: 'CLOCK',
        voting_open: false,
        config_json: '{}',
        state_json: '{}',
      },
    ]);
    expect(screen.queryByText('Clock')).toBeNull();
  });
});
