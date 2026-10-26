import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import ChallengeBallotPanel from '../ChallengeBallotPanel';
import ChallengeJudgePanel from '../ChallengeJudgePanel';
import ChallengeStandings from '../ChallengeStandings';
import ChallengeResultCard from '../ChallengeResultCard';
import { JudgeSheetForm } from '../judge-sheet-form';
import { buildJudgeSheetSchema } from '../judge-sheet-form/judge-sheet.types';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({ useMutation: vi.fn(), success: vi.fn(), error: vi.fn() }));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useMutation: h.useMutation }));
vi.mock('../../notify', () => ({ notifySuccess: h.success, notifyError: h.error }));
vi.mock('../ShareChallengeButton', () => ({ default: () => <span data-testid="share" /> }));
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDateTime: (d: string) => `at:${d}` }),
}));

const competitors = [
  { competitor_id: 'c1', name: 'Asha' },
  { competitor_id: 'c2', name: 'Bela' },
];

beforeEach(() => vi.clearAllMocks());

describe('ChallengeBallotPanel', () => {
  const setup = (vote = vi.fn().mockResolvedValue({}), rate = vi.fn().mockResolvedValue({}), loading = [false, false]) => {
    let call = 0;
    h.useMutation.mockImplementation(() => {
      const i = call++ % 2;
      return [i === 0 ? vote : rate, { loading: loading[i] }];
    });
    return { vote, rate };
  };
  const tool = (over: object = {}) =>
    ({ instance_id: 't1', label: 'Crowd vote', input_kind: 'VOTE', voting_open: true, config_json: '{}', ...over }) as never;
  const ch = (my_votes: object[] = []) => ({ id: 'ch1', competitors, viewer: { my_votes } }) as never;

  it('says voting is closed instead of showing the ballot', () => {
    setup();
    render(<ChallengeBallotPanel challenge={ch()} tool={tool({ voting_open: false })} />);
    expect(screen.getByText(fallbackT('mweb.challenge.votingClosed', { vars: { label: 'Crowd vote' } }))).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('casts a vote for a competitor, confirming it', async () => {
    const { vote } = setup();
    render(<ChallengeBallotPanel challenge={ch()} tool={tool()} />);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.voteFor', { vars: { name: 'Bela' } }) }));
    await waitFor(() => expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.challenge.ballotSaved')));
    expect(vote).toHaveBeenCalledWith({ variables: { id: 'ch1', toolInstanceId: 't1', candidateId: 'c2' } });
  });

  it('marks the chosen competitor and shows the server reason when a vote is refused', async () => {
    setup(vi.fn().mockRejectedValue(new Error('Voting has not started')));
    render(<ChallengeBallotPanel challenge={ch([{ tool_instance_id: 't1', candidate_id: 'c1' }, { tool_instance_id: 'other', candidate_id: 'c2' }])} tool={tool()} />);
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.votedFor', { vars: { name: 'Asha' } }) })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.voteFor', { vars: { name: 'Bela' } }) })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.voteFor', { vars: { name: 'Bela' } }) }));
    await waitFor(() => expect(h.error).toHaveBeenCalledWith('Voting has not started'));
    expect(h.success).not.toHaveBeenCalled();
  });

  it('disables the ballot while a vote or a rating is being saved', () => {
    setup(undefined, undefined, [true, false]);
    render(<ChallengeBallotPanel challenge={ch()} tool={tool()} />);
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });

  it('rates a competitor on a star scale from the tool config', async () => {
    const { rate } = setup();
    render(<ChallengeBallotPanel challenge={ch([{ tool_instance_id: 't1', candidate_id: 'c1', value: 2 }])} tool={tool({ input_kind: 'RATE', config_json: '{"scale_max":10}' })} />);
    expect(screen.getAllByRole('radio', { name: /Star/ })).toBeTruthy();
    fireEvent.click(screen.getAllByLabelText('7 Stars')[1]);
    await waitFor(() => expect(rate).toHaveBeenCalledWith({ variables: { id: 'ch1', toolInstanceId: 't1', candidateId: 'c2', value: 7 } }));
    expect(screen.getByText('Asha')).toBeInTheDocument();
  });

  it('defaults to five stars', () => {
    setup();
    render(<ChallengeBallotPanel challenge={ch()} tool={tool({ input_kind: 'RATE' })} />);
    expect(screen.getAllByLabelText('5 Stars')).toHaveLength(2);
    expect(screen.queryAllByLabelText('6 Stars')).toHaveLength(0);
  });

  it('ignores a click that merely clears an existing rating', async () => {
    const { rate } = setup();
    render(<ChallengeBallotPanel challenge={ch([{ tool_instance_id: 't1', candidate_id: 'c1', value: 3 }])} tool={tool({ input_kind: 'RATE' })} />);
    fireEvent.click(screen.getAllByLabelText('3 Stars')[0]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(rate).not.toHaveBeenCalled();
    expect(h.error).not.toHaveBeenCalled();
  });

  it('disables the rating while saving', () => {
    setup(undefined, undefined, [false, true]);
    render(<ChallengeBallotPanel challenge={ch()} tool={tool({ input_kind: 'RATE' })} />);
    screen.getAllByRole('radio').forEach((r) => expect(r).toBeDisabled());
  });
});

describe('ChallengeJudgePanel', () => {
  const tool = (config: unknown) => ({ instance_id: 't1', label: 'Judging', config_json: JSON.stringify(config) }) as never;

  const setup = (judge = vi.fn().mockResolvedValue({}), loading = false) => {
    h.useMutation.mockReturnValue([judge, { loading }]);
    return judge;
  };

  it('submits every criterion for the chosen competitor and confirms', async () => {
    const judge = setup();
    render(<ChallengeJudgePanel challenge={{ id: 'ch1', competitors } as never} tool={tool({ criteria: [{ key: 'style', label: 'Style', max: 10 }, { key: 'taste', label: 'Taste', max: 5 }] })} />);
    fireEvent.change(screen.getByLabelText(/Style/), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/Taste/), { target: { value: '4.5' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.submitScores') }));
    await waitFor(() => expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.challenge.judgeSaved')));
    expect(judge).toHaveBeenCalledWith({
      variables: {
        id: 'ch1',
        toolInstanceId: 't1',
        candidateId: 'c1',
        scores: [{ key: 'style', value: 8 }, { key: 'taste', value: 4.5 }],
      },
    });
    // The sheet clears for the next competitor, keeping the chosen one.
    await waitFor(() => expect(screen.getByLabelText(/Style/)).toHaveValue(null));
  });

  it('shows the server reason and keeps the marks when the sheet is refused', async () => {
    setup(vi.fn().mockRejectedValue(new Error('Judges only')));
    render(<ChallengeJudgePanel challenge={{ id: 'ch1', competitors } as never} tool={tool({ criteria: [{ key: 'style', label: 'Style', max: 10 }] })} />);
    fireEvent.change(screen.getByLabelText(/Style/), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.submitScores') }));
    await waitFor(() => expect(h.error).toHaveBeenCalledWith('Judges only'));
    expect(screen.getByLabelText(/Style/)).toHaveValue(8);
  });

  it('renders an empty sheet for a tool with no criteria', () => {
    setup();
    render(<ChallengeJudgePanel challenge={{ id: 'ch1', competitors } as never} tool={tool({})} />);
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.submitScores') })).toBeInTheDocument();
  });

  it('disables the submit button while saving', () => {
    setup(undefined, true);
    render(<ChallengeJudgePanel challenge={{ id: 'ch1', competitors } as never} tool={tool({})} />);
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.submitScores') })).toBeDisabled();
  });
});

describe('JudgeSheetForm validation', () => {
  const criteria = [{ key: 'style', label: 'Style', max: 10 }];

  it('rejects a missing, negative or too-high mark and does not submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<JudgeSheetForm criteria={criteria} competitors={competitors} saving={false} onSubmit={onSubmit} />);
    const submit = screen.getByRole('button', { name: fallbackT('mweb.challenge.submitScores') });
    fireEvent.click(submit);
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.mark', { vars: { max: 10 } }))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Style/), { target: { value: '11' } });
    fireEvent.click(submit);
    await waitFor(() => expect(screen.getByLabelText(/Style/)).toHaveAttribute('aria-invalid', 'true'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps the marks when the save was not accepted, and accepts the boundaries', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(<JudgeSheetForm criteria={criteria} competitors={competitors} saving={false} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Style/), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.submitScores') }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ candidate_id: 'c1', marks: { style: 10 } }));
    expect(screen.getByLabelText(/Style/)).toHaveValue(10);
    fireEvent.change(screen.getByLabelText(/Style/), { target: { value: '' } });
    expect(screen.getByLabelText(/Style/)).toHaveValue(null);
  });

  it('lets the judge switch competitor', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<JudgeSheetForm criteria={criteria} competitors={competitors} saving={false} onSubmit={onSubmit} />);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Bela' }));
    fireEvent.change(screen.getByLabelText(/Style/), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.submitScores') }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ candidate_id: 'c2', marks: { style: 3 } }));
  });

  it('starts with no competitor when there are none, and reports the missing pick', async () => {
    const onSubmit = vi.fn();
    render(<JudgeSheetForm criteria={[]} competitors={[]} saving={false} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.submitScores') }));
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.pickCompetitor'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('builds a schema that bounds each mark by its criterion max', () => {
    const schema = buildJudgeSheetSchema((key) => key, criteria);
    expect(schema.safeParse({ candidate_id: 'c1', marks: { style: 0 } }).success).toBe(true);
    expect(schema.safeParse({ candidate_id: 'c1', marks: { style: 10 } }).success).toBe(true);
    expect(schema.safeParse({ candidate_id: 'c1', marks: { style: -1 } }).success).toBe(false);
    expect(schema.safeParse({ candidate_id: 'c1', marks: { style: 10.5 } }).success).toBe(false);
    expect(schema.safeParse({ candidate_id: '', marks: { style: 1 } }).success).toBe(false);
  });
});

describe('ChallengeStandings', () => {
  const rows = [
    { competitor_id: 'c1', name: 'Asha', rank: 1, total: 30 },
    { competitor_id: 'c2', name: 'Bela', rank: 2, total: 20 },
    { competitor_id: 'c3', name: 'Chitra', rank: 3, total: 10 },
    { competitor_id: 'c4', name: 'Dev', rank: 4, total: 5 },
  ];

  it('says there are no standings yet', () => {
    render(<ChallengeStandings standings={[]} />);
    expect(screen.getByText(fallbackT('mweb.challenge.noStandings'))).toBeInTheDocument();
  });

  it('shows medals for the podium, plain numbers after and the totals', () => {
    render(<ChallengeStandings standings={rows} />);
    expect(screen.getByRole('list', { name: fallbackT('mweb.challenge.standings') })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByTitle(fallbackT('mweb.challenge.rank', { vars: { rank: 1 } }))).toBeInTheDocument();
    expect(screen.getByTitle(fallbackT('mweb.challenge.rank', { vars: { rank: 3 } }))).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByLabelText(fallbackT('mweb.challenge.score', { vars: { score: 30 } }))).toHaveTextContent('30');
  });

  it('limits the rows for a preview and supports the large projector layout', () => {
    render(<ChallengeStandings standings={rows} limit={2} large />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText('Chitra')).not.toBeInTheDocument();
  });

  it('renders every row in the large layout, numbers included', () => {
    render(<ChallengeStandings standings={rows} large />);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});

describe('ChallengeResultCard', () => {
  const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
  const result = (over: object = {}) => ({
    version: 1,
    published_at: '2026-06-01T10:00:00.000Z',
    reason: '',
    winner_ids: ['c1'],
    standings: [
      { competitor_id: 'c1', name: 'Asha', rank: 1, total: 30 },
      { competitor_id: 'c2', name: 'Bela', rank: 2, total: 20 },
      { competitor_id: 'c3', name: 'Chitra', rank: 3, total: 10 },
      { competitor_id: 'c4', name: 'Dev', rank: 4, total: 5 },
    ],
    ...over,
  });
  const card = (resultValue: object | null, showViewLink?: boolean) =>
    render(
      <MemoryRouter initialEntries={['/start']}>
        <Routes>
          <Route path="/start" element={<ChallengeResultCard challenge={{ id: 'ch1', pod_id: 'p1', name: 'Quiz night', result: resultValue } as never} showViewLink={showViewLink} />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );

  it('renders nothing before a result is published', () => {
    card(null);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('shows the winner, the next two places and the publish time', () => {
    card(result());
    expect(screen.getByRole('region', { name: 'Quiz night' })).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.challenge.winner', { vars: { names: 'Asha', score: 30 } }))).toBeInTheDocument();
    expect(screen.getByText(`${fallbackT('mweb.challenge.placed', { vars: { rank: 2, name: 'Bela' } })} · ${fallbackT('mweb.challenge.placed', { vars: { rank: 3, name: 'Chitra' } })}`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(fallbackT('mweb.challenge.publishedOn', { vars: { date: 'at:2026-06-01T10:00:00.000Z' } })))).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(fallbackT('mweb.challenge.corrected')))).not.toBeInTheDocument();
  });

  it('names tied winners together and flags a corrected result', () => {
    card(result({ winner_ids: ['c1', 'c2'], version: 2, standings: [{ competitor_id: 'c1', name: 'Asha', rank: 1, total: 30 }, { competitor_id: 'c2', name: 'Bela', rank: 1, total: 30 }] }));
    expect(screen.getByText(fallbackT('mweb.challenge.winnersTie', { vars: { names: 'Asha, Bela', score: 30 } }))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(fallbackT('mweb.challenge.corrected')))).toBeInTheDocument();
  });

  it('copes with a result that has no winners listed, and no podium', () => {
    card(result({ winner_ids: [], standings: [] }));
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('expands and collapses the full leaderboard', () => {
    card(result());
    const toggle = screen.getByRole('button', { name: fallbackT('mweb.challenge.showLeaderboard') });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.hideLeaderboard') })).toHaveAttribute('aria-expanded', 'true');
  });

  it('links to the live results page, unless that is where it already is', () => {
    const { unmount } = card(result());
    expect(screen.getByTestId('share')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.viewResults') }));
    expect(screen.getByTestId('where')).toHaveTextContent('/pod/p1/challenges/ch1/live');
    unmount();
    card(result(), false);
    expect(screen.queryByRole('button', { name: fallbackT('mweb.challenge.viewResults') })).not.toBeInTheDocument();
  });
});
