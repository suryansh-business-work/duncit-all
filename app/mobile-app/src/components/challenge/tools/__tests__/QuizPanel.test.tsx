import { fireEvent, screen } from '@testing-library/react-native';

import { QuizPanel } from '@/components/challenge/tools/QuizPanel';
import type { PanelProps } from '@/components/challenge/tools/ToolCard';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});

const QUESTIONS = [
  { key: 'q1', label: 'Capital of France?', options: ['Rome', 'Paris', 'Oslo'], points: 5 },
  { key: 'q2', label: 'Second', options: ['A'], points: 1 },
];

const quizTool = (patch: Record<string, unknown> = {}, active: string | null = 'q1') =>
  ({
    instance_id: 'z1',
    label: 'Quiz',
    input_kind: 'QUIZ',
    voting_open: true,
    config_json: JSON.stringify({ questions: QUESTIONS }),
    state_json: JSON.stringify(active ? { active } : {}),
    ...patch,
  }) as unknown as PanelProps['tool'];

const challengeOf = (viewer: Record<string, unknown> = {}) =>
  ({
    id: 'ch1',
    status: 'LIVE',
    competitors: [],
    viewer: { my_competitor_id: 'c1', my_votes: [], ...viewer },
  }) as unknown as PanelProps['challenge'];

const actionsOf = (busy = false) =>
  ({ busy, answer: jest.fn().mockResolvedValue(true) }) as unknown as PanelProps['actions'] & {
    answer: jest.Mock;
  };

const mount = (tool = quizTool(), challenge = challengeOf(), actions = actionsOf()) => {
  renderWithProviders(<QuizPanel challenge={challenge} tool={tool} actions={actions} />);
  return actions;
};

const answerVote = (value: number, patch: Record<string, unknown> = {}) => ({
  tool_instance_id: 'z1',
  kind: 'ANSWER',
  scope_key: 'q1',
  value,
  ...patch,
});

describe('QuizPanel', () => {
  it('waits for the host while no question is open', () => {
    mount(quizTool({}, null));
    expect(screen.getByText('Quiz')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.quizWaiting')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-quiz-z1-0')).toBeNull();
  });

  it('shows the open question, its points and one button per option', () => {
    mount();
    expect(screen.getByText('Capital of France?')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.score|5')).toBeOnTheScreen();
    expect(screen.getByText('Rome')).toBeOnTheScreen();
    expect(screen.getByText('Paris')).toBeOnTheScreen();
    expect(screen.getByText('Oslo')).toBeOnTheScreen();
    expect(screen.queryByText('mweb.challenge.tools.quizWaiting')).toBeNull();
  });

  it('lets a competitor answer while the question is open', () => {
    const actions = mount();
    expect(screen.getByTestId('challenge-quiz-z1-1')).toBeEnabled();
    fireEvent.press(screen.getByTestId('challenge-quiz-z1-1'));
    expect(actions.answer).toHaveBeenCalledWith('z1', 1);
  });

  it('locks the options and confirms once the competitor answered', () => {
    mount(quizTool(), challengeOf({ my_votes: [answerVote(2)] }));
    expect(screen.getByText('mweb.challenge.tools.quizAnswered')).toBeOnTheScreen();
    for (const index of [0, 1, 2]) {
      expect(screen.getByTestId(`challenge-quiz-z1-${index}`)).toBeDisabled();
    }
    expect(screen.queryByText('mweb.challenge.tools.quizClosed')).toBeNull();
  });

  it('ignores answers to other questions or tools', () => {
    mount(
      quizTool(),
      challengeOf({
        my_votes: [
          answerVote(0, { scope_key: 'q2' }),
          answerVote(0, { tool_instance_id: 'other' }),
          answerVote(0, { kind: 'POLL' }),
        ],
      }),
    );
    expect(screen.queryByText('mweb.challenge.tools.quizAnswered')).toBeNull();
    expect(screen.getByTestId('challenge-quiz-z1-0')).toBeEnabled();
  });

  it('says answers are closed once the host closed the question and the competitor never answered', () => {
    mount(quizTool({ voting_open: false }));
    expect(screen.getByText('mweb.challenge.tools.quizClosed')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-quiz-z1-0')).toBeDisabled();
  });

  it('shows only the answered note, not the closed one, when answers closed after the competitor answered', () => {
    mount(quizTool({ voting_open: false }), challengeOf({ my_votes: [answerVote(1)] }));
    expect(screen.getByText('mweb.challenge.tools.quizAnswered')).toBeOnTheScreen();
    expect(screen.queryByText('mweb.challenge.tools.quizClosed')).toBeNull();
  });

  it('shows a spectator the question but tells them only competitors answer', () => {
    mount(quizTool(), challengeOf({ my_competitor_id: null }));
    expect(screen.getByText('Capital of France?')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.tools.competitorsOnly')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-quiz-z1-0')).toBeDisabled();
  });

  it('disables the options while an action is in flight', () => {
    mount(quizTool(), challengeOf(), actionsOf(true));
    expect(screen.getByTestId('challenge-quiz-z1-0')).toBeDisabled();
  });
});
