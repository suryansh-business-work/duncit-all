import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import ChallengePollPanel from '../ChallengePollPanel';
import ChallengeQuizPanel from '../ChallengeQuizPanel';
import ChallengeBuzzerPanel from '../ChallengeBuzzerPanel';
import ChallengePickPanel from '../ChallengePickPanel';
import ChallengeItemsPanel from '../ChallengeItemsPanel';
import ChallengeToolPanels from '../ChallengeToolPanels';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({ actions: vi.fn() }));
vi.mock('../useChallengeToolActions', () => ({ useChallengeToolActions: h.actions }));
vi.mock('../ChallengeSubmissionPanel', () => ({ default: () => <div data-testid="submission-panel" /> }));

const viewer = (over: object = {}) => ({
  can_interact: true,
  my_competitor_id: 'c1',
  my_votes: [] as object[],
  ...over,
});

const competitors = [
  { competitor_id: 'c1', name: 'Asha' },
  { competitor_id: 'c2', name: 'Bela' },
];

const challenge = (over: { viewer?: object } = {}) =>
  ({ id: 'ch1', status: 'LIVE', competitors, viewer: viewer(over.viewer) }) as never;

const acts = () => ({
  busy: false,
  poll: vi.fn().mockResolvedValue(true),
  answer: vi.fn().mockResolvedValue(true),
  buzz: vi.fn().mockResolvedValue(true),
});

const json = (value: unknown) => JSON.stringify(value);

beforeEach(() => vi.clearAllMocks());

describe('ChallengePollPanel', () => {
  const tool = (over: object = {}) =>
    ({
      instance_id: 't1',
      label: 'Best snack',
      voting_open: true,
      config_json: json({ options: [{ key: 'a', label: 'Samosa' }, { key: 'b', label: 'Chai' }] }),
      state_json: json({ tallies: { a: 3, b: 1 }, total: 4 }),
      ...over,
    }) as never;

  it('lets an attendee vote while open, marking their vote, and sends the option key', () => {
    const actions = acts();
    render(
      <ChallengePollPanel
        challenge={challenge({ viewer: { my_votes: [{ tool_instance_id: 't1', kind: 'POLL', candidate_id: 'b' }] } })}
        tool={tool()}
        actions={actions as never}
        interactive
      />
    );
    expect(screen.getByRole('button', { name: 'Chai' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Samosa' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Samosa' }));
    expect(actions.poll).toHaveBeenCalledWith('t1', 'a');
    expect(screen.getByRole('progressbar', { name: 'Samosa' })).toHaveAttribute('aria-valuenow', '75');
    expect(screen.queryByText(fallbackT('mweb.challenge.votingClosed', { vars: { label: 'Best snack' } }))).not.toBeInTheDocument();
  });

  it('shows read-only options with the viewer vote emphasised when voting is closed, and says so', () => {
    render(
      <ChallengePollPanel
        challenge={challenge({ viewer: { my_votes: [{ tool_instance_id: 't1', kind: 'POLL', candidate_id: 'a' }] } })}
        tool={tool({ voting_open: false })}
        actions={acts() as never}
        interactive
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Samosa')).toHaveStyle({ fontWeight: '700' });
    expect(screen.getByText('Chai')).toHaveStyle({ fontWeight: '400' });
    expect(screen.getByText(fallbackT('mweb.challenge.votingClosed', { vars: { label: 'Best snack' } }))).toBeInTheDocument();
  });

  it('is read-only on a projector and for a viewer who cannot interact', () => {
    const { unmount } = render(<ChallengePollPanel challenge={challenge()} tool={tool()} actions={acts() as never} interactive={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();
    render(<ChallengePollPanel challenge={challenge({ viewer: { can_interact: false } })} tool={tool()} actions={acts() as never} interactive />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('disables the options while an action is running', () => {
    render(<ChallengePollPanel challenge={challenge()} tool={tool()} actions={{ ...acts(), busy: true } as never} interactive />);
    expect(screen.getByRole('button', { name: 'Samosa' })).toBeDisabled();
  });
});

describe('ChallengeQuizPanel', () => {
  const quiz = (over: object = {}) =>
    ({
      instance_id: 'q1',
      label: 'Trivia',
      voting_open: true,
      config_json: json({ questions: [{ key: 'k1', label: 'Capital of India?', options: ['Delhi', 'Mumbai'], points: 5 }] }),
      state_json: json({ active: 'k1' }),
      ...over,
    }) as never;

  it('waits for the host when no question is open', () => {
    render(<ChallengeQuizPanel challenge={challenge()} tool={quiz({ state_json: json({}) })} actions={acts() as never} interactive />);
    expect(screen.getByText(fallbackT('mweb.challenge.tools.quizWaiting'))).toBeInTheDocument();
  });

  it('lets a competitor answer once and shows the question with its points', () => {
    const actions = acts();
    render(<ChallengeQuizPanel challenge={challenge()} tool={quiz()} actions={actions as never} interactive />);
    expect(screen.getByRole('heading', { name: 'Capital of India?' })).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.challenge.score', { vars: { score: 5 } }))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mumbai' }));
    expect(actions.answer).toHaveBeenCalledWith('q1', 1);
  });

  it('locks the answer after the competitor has answered and says so', () => {
    render(
      <ChallengeQuizPanel
        challenge={challenge({ viewer: { my_votes: [{ tool_instance_id: 'q1', kind: 'ANSWER', scope_key: 'k1', value: 0 }] } })}
        tool={quiz()}
        actions={acts() as never}
        interactive
      />
    );
    expect(screen.getByRole('button', { name: 'Delhi' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Delhi' })).toBeDisabled();
    expect(screen.getByText(fallbackT('mweb.challenge.tools.quizAnswered'))).toBeInTheDocument();
    expect(screen.queryByText(fallbackT('mweb.challenge.tools.quizClosed'))).not.toBeInTheDocument();
  });

  it('says answers are closed when voting is shut and nothing was answered', () => {
    render(<ChallengeQuizPanel challenge={challenge()} tool={quiz({ voting_open: false })} actions={acts() as never} interactive />);
    expect(screen.getByText(fallbackT('mweb.challenge.tools.quizClosed'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delhi' })).toBeDisabled();
  });

  it('tells a non-competitor that only competitors answer, and nothing on a projector', () => {
    const { unmount } = render(
      <ChallengeQuizPanel challenge={challenge({ viewer: { my_competitor_id: null } })} tool={quiz()} actions={acts() as never} interactive />
    );
    expect(screen.getByText(fallbackT('mweb.challenge.tools.competitorsOnly'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delhi' })).toBeDisabled();
    unmount();
    render(<ChallengeQuizPanel challenge={challenge({ viewer: { my_competitor_id: null } })} tool={quiz()} actions={acts() as never} interactive={false} />);
    expect(screen.queryByText(fallbackT('mweb.challenge.tools.competitorsOnly'))).not.toBeInTheDocument();
  });

  it('disables answering while an action runs', () => {
    render(<ChallengeQuizPanel challenge={challenge()} tool={quiz()} actions={{ ...acts(), busy: true } as never} interactive />);
    expect(screen.getByRole('button', { name: 'Delhi' })).toBeDisabled();
  });
});

describe('ChallengeBuzzerPanel', () => {
  const buzzer = (over: object = {}) =>
    ({ instance_id: 'b1', label: 'Buzzer', voting_open: true, config_json: '{}', state_json: json({ round: 2, order: ['c2', 'c1'] }), ...over }) as never;

  it('shows the armed note, the buzz order with the fastest emphasised, and lets a competitor buzz', () => {
    const actions = acts();
    render(<ChallengeBuzzerPanel challenge={challenge()} tool={buzzer()} actions={actions as never} interactive />);
    expect(screen.getByText(fallbackT('mweb.challenge.tools.buzzArmed'))).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Bela');
    expect(items[1]).toHaveTextContent('Asha');
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.buzz') }));
    expect(actions.buzz).toHaveBeenCalledWith('b1');
  });

  it('shows the waiting note and disables the button while closed', () => {
    render(<ChallengeBuzzerPanel challenge={challenge()} tool={buzzer({ voting_open: false })} actions={acts() as never} interactive />);
    expect(screen.getByText(fallbackT('mweb.challenge.tools.buzzWaiting'))).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows Buzzed and disables the button once this round has been pressed', () => {
    render(
      <ChallengeBuzzerPanel
        challenge={challenge({ viewer: { my_votes: [{ tool_instance_id: 'b1', kind: 'BUZZ', scope_key: 'r2' }] } })}
        tool={buzzer()}
        actions={acts() as never}
        interactive
      />
    );
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.buzzed') })).toBeDisabled();
  });

  it('does not treat a press from another round as this one', () => {
    render(
      <ChallengeBuzzerPanel
        challenge={challenge({ viewer: { my_votes: [{ tool_instance_id: 'b1', kind: 'BUZZ', scope_key: 'r1' }] } })}
        tool={buzzer()}
        actions={acts() as never}
        interactive
      />
    );
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.buzz') })).toBeEnabled();
  });

  it('tells a non-competitor only competitors buzz, with no button, and says nobody buzzed yet', () => {
    render(
      <ChallengeBuzzerPanel
        challenge={challenge({ viewer: { my_competitor_id: null } })}
        tool={buzzer({ state_json: json({ round: 0 }) })}
        actions={acts() as never}
        interactive
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.challenge.tools.competitorsOnly'))).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.challenge.tools.buzzNobody'))).toBeInTheDocument();
  });

  it('shows no controls or role note on a projector, and tolerates an unknown competitor in the order', () => {
    render(
      <ChallengeBuzzerPanel
        challenge={challenge()}
        tool={buzzer({ state_json: json({ round: 1, order: ['ghost'] }) })}
        actions={acts() as never}
        interactive={false}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText(fallbackT('mweb.challenge.tools.competitorsOnly'))).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('disables the button while an action runs', () => {
    render(<ChallengeBuzzerPanel challenge={challenge()} tool={buzzer()} actions={{ ...acts(), busy: true } as never} interactive />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('ChallengePickPanel', () => {
  const picker = (picked: string[]) => ({ instance_id: 'p1', label: 'Picker', config_json: '{}', state_json: json({ picked }) }) as never;

  it('says nothing has been drawn yet', () => {
    render(<ChallengePickPanel challenge={challenge()} tool={picker([])} />);
    expect(screen.getByText(fallbackT('mweb.challenge.tools.pickNone'))).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows the latest draw prominently and earlier draws numbered in order, repeats included', () => {
    render(<ChallengePickPanel challenge={challenge()} tool={picker(['c1', 'c2', 'c1'])} />);
    expect(screen.getByRole('status')).toHaveTextContent(fallbackT('mweb.challenge.tools.pickLatest', { vars: { name: 'Asha' } }));
    const earlier = screen.getAllByRole('listitem');
    expect(earlier).toHaveLength(2);
    expect(earlier[0]).toHaveTextContent(fallbackT('mweb.challenge.tools.place', { vars: { place: 1, name: 'Asha' } }));
    expect(earlier[1]).toHaveTextContent(fallbackT('mweb.challenge.tools.place', { vars: { place: 2, name: 'Bela' } }));
  });

  it('shows only the latest when a single draw was made, and a blank name for an unknown competitor', () => {
    render(<ChallengePickPanel challenge={challenge()} tool={picker(['ghost'])} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toBe(fallbackT('mweb.challenge.tools.pickLatest', { vars: { name: '' } }));
    expect(screen.getByRole('status')).not.toHaveTextContent('ghost');
  });
});

describe('ChallengeItemsPanel', () => {
  const items = (kind = 'CHECK') =>
    ({
      instance_id: 'i1',
      label: 'Checklist',
      input_kind: kind,
      config_json: json({ items: [{ key: 'x', label: 'Find the flag', points: 2 }, { key: 'y', label: 'Take a photo', points: 3 }] }),
      state_json: json({ done: { c1: ['x'], c2: ['x', 'y'] } }),
    }) as never;

  it('shows every competitor progress and the viewer own list with done and pending marks', () => {
    render(<ChallengeItemsPanel challenge={challenge()} tool={items()} />);
    const asha = fallbackT('mweb.challenge.tools.itemsProgress', { vars: { name: 'Asha', done: 1, total: 2 } });
    expect(screen.getByRole('progressbar', { name: asha })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByRole('progressbar', { name: fallbackT('mweb.challenge.tools.itemsProgress', { vars: { name: 'Bela', done: 2, total: 2 } }) })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('list', { name: fallbackT('mweb.challenge.tools.itemsMine') })).toBeInTheDocument();
    expect(screen.getByTitle(fallbackT('mweb.challenge.tools.itemDone'))).toBeInTheDocument();
    expect(screen.getByTitle(fallbackT('mweb.challenge.tools.itemPending'))).toBeInTheDocument();
    expect(screen.queryByText(fallbackT('mweb.challenge.tools.checkpointHint'))).not.toBeInTheDocument();
  });

  it('hints how to reach a checkpoint for a competitor', () => {
    render(<ChallengeItemsPanel challenge={challenge()} tool={items('CHECKPOINT')} />);
    expect(screen.getByText(fallbackT('mweb.challenge.tools.checkpointHint'))).toBeInTheDocument();
  });

  it('shows no personal list to a viewer who is not competing', () => {
    render(<ChallengeItemsPanel challenge={challenge({ viewer: { my_competitor_id: null } })} tool={items('CHECKPOINT')} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(fallbackT('mweb.challenge.tools.checkpointHint'))).not.toBeInTheDocument();
  });

  it('shows zero progress, not NaN, for a tool with no items', () => {
    render(<ChallengeItemsPanel challenge={challenge()} tool={{ instance_id: 'i2', label: 'Empty', input_kind: 'CHECK', config_json: '{}', state_json: '{}' } as never} />);
    expect(screen.getAllByRole('progressbar')[0]).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('ChallengeToolPanels', () => {
  const full = {
    ...({ id: 'ch1', status: 'LIVE', competitors, viewer: viewer() } as object),
    tools: [
      { instance_id: 'a', input_kind: 'POLL', label: 'Poll', voting_open: true, config_json: '{}', state_json: '{}' },
      { instance_id: 'b', input_kind: 'SUBMIT', label: 'Submit', config_json: '{}', state_json: '{}' },
      { instance_id: 'c', input_kind: 'JUDGE', label: 'Judge', config_json: '{}', state_json: '{}' },
    ],
  } as never;

  it('renders a panel for each run tool and nothing for scored-by-hand ones', () => {
    h.actions.mockReturnValue(acts());
    render(<ChallengeToolPanels challenge={full} interactive />);
    expect(h.actions).toHaveBeenCalledWith('ch1');
    expect(screen.getByRole('region', { name: 'Poll' })).toBeInTheDocument();
    expect(screen.getByTestId('submission-panel')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Judge' })).not.toBeInTheDocument();
  });

  it('limits the panels to the requested kinds', () => {
    h.actions.mockReturnValue(acts());
    render(<ChallengeToolPanels challenge={full} interactive only={['SUBMIT']} />);
    expect(screen.queryByRole('region', { name: 'Poll' })).not.toBeInTheDocument();
    expect(screen.getByTestId('submission-panel')).toBeInTheDocument();
  });
});
