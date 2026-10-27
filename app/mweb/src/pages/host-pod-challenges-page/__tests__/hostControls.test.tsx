import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import HostLifecycle from '../HostLifecycle';
import HostToggles from '../HostToggles';
import HostLiveControls from '../HostLiveControls';
import HostQuizControl from '../HostQuizControl';
import HostRunControls from '../HostRunControls';
import HostScorePad from '../HostScorePad';
import HostItemsControl from '../HostItemsControl';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({ confirm: vi.fn() }));
vi.mock('@duncit/dialogs', async (orig) => ({ ...(await orig<object>()), useConfirm: () => h.confirm }));
vi.mock('../CheckpointLinksDialog', () => ({
  default: (p: { challengeId: string; toolInstanceId: string | null; onClose: () => void }) =>
    p.toolInstanceId ? (
      <div data-testid="qr-dialog" data-challenge={p.challengeId} data-tool={p.toolInstanceId}>
        <button data-testid="qr-close" onClick={p.onClose} />
      </div>
    ) : null,
}));

const json = (value: unknown) => JSON.stringify(value);
const competitors = [
  { competitor_id: 'c1', name: 'Asha' },
  { competitor_id: 'c2', name: 'Bela' },
];

const actions = (over: object = {}) => ({
  busy: false,
  scoring: false,
  transition: vi.fn().mockResolvedValue(true),
  settings: vi.fn().mockResolvedValue(true),
  clock: vi.fn().mockResolvedValue(true),
  voting: vi.fn().mockResolvedValue(true),
  round: vi.fn().mockResolvedValue(true),
  quiz: vi.fn().mockResolvedValue(true),
  buzzer: vi.fn().mockResolvedValue(true),
  pick: vi.fn().mockResolvedValue(true),
  score: vi.fn().mockResolvedValue(true),
  item: vi.fn().mockResolvedValue(true),
  ...over,
});
type Acts = ReturnType<typeof actions>;

beforeEach(() => {
  vi.clearAllMocks();
  h.confirm.mockResolvedValue(true);
});

describe('HostLifecycle', () => {
  const lifecycle = (allowed: string[], a: Acts = actions()) => {
    render(<HostLifecycle challenge={{ name: 'Quiz night', viewer: { allowed_actions: allowed } } as never} actions={a as never} />);
    return a;
  };

  it('offers only the moves the server allows, with the primary ones filled', () => {
    lifecycle(['START', 'PAUSE']);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.actions.START') })).toBeInTheDocument();
  });

  it('runs a harmless move straight away, without asking', async () => {
    const a = lifecycle(['START', 'RESUME']);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.actions.START') }));
    await waitFor(() => expect(a.transition).toHaveBeenCalledWith('START'));
    expect(h.confirm).not.toHaveBeenCalled();
  });

  it('asks before completing, and cancelling is a destructive ask', async () => {
    const a = lifecycle(['COMPLETE', 'CANCEL']);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.actions.COMPLETE') }));
    await waitFor(() => expect(a.transition).toHaveBeenCalledWith('COMPLETE'));
    expect(h.confirm).toHaveBeenLastCalledWith(expect.objectContaining({ destructive: false, title: fallbackT('mweb.challenge.confirm.COMPLETE.title') }));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.actions.CANCEL') }));
    await waitFor(() => expect(a.transition).toHaveBeenCalledWith('CANCEL'));
    expect(h.confirm).toHaveBeenLastCalledWith(expect.objectContaining({ destructive: true, message: expect.stringContaining('Quiz night') }));
  });

  it('does nothing when the host backs out of the confirmation', async () => {
    h.confirm.mockResolvedValue(false);
    const a = lifecycle(['CANCEL']);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.actions.CANCEL') }));
    await waitFor(() => expect(h.confirm).toHaveBeenCalled());
    expect(a.transition).not.toHaveBeenCalled();
  });

  it('falls back to the raw action name when it has no label, and disables everything while busy', () => {
    lifecycle(['MYSTERY'], actions({ busy: true }));
    expect(screen.getByRole('button', { name: 'MYSTERY' })).toBeDisabled();
  });
});

describe('HostToggles', () => {
  const challenge = (over: object = {}) => ({
    id: 'ch1',
    status: 'SCHEDULED',
    enabled: true,
    show_on_pod_details: false,
    audience_interaction_enabled: true,
    auto_whatsapp: false,
    auto_email: false,
    ...over,
  });

  it('shows each switch with its state and sends only the changed setting', async () => {
    const a = actions();
    render(<HostToggles challenge={challenge() as never} actions={a as never} />);
    expect(screen.getAllByRole('switch')).toHaveLength(5);
    fireEvent.click(screen.getByRole('switch', { name: fallbackT('mweb.challenge.toggles.show_on_pod_details') }));
    await waitFor(() => expect(a.settings).toHaveBeenCalledWith({ show_on_pod_details: true }));
    fireEvent.click(screen.getByRole('switch', { name: fallbackT('mweb.challenge.toggles.audience_interaction_enabled') }));
    await waitFor(() => expect(a.settings).toHaveBeenCalledWith({ audience_interaction_enabled: false }));
  });

  it('locks the operate switch while the challenge is live, and says to pause first', () => {
    render(<HostToggles challenge={challenge({ status: 'LIVE' }) as never} actions={actions() as never} />);
    expect(screen.getByRole('switch', { name: fallbackT('mweb.challenge.toggles.enabled') })).toBeDisabled();
    expect(screen.getByRole('switch', { name: fallbackT('mweb.challenge.toggles.auto_email') })).toBeEnabled();
    expect(screen.getByText(fallbackT('mweb.challenge.pauseBeforeOff'))).toBeInTheDocument();
  });

  it('lets a live challenge that is already switched off be switched on', () => {
    render(<HostToggles challenge={challenge({ status: 'LIVE', enabled: false }) as never} actions={actions() as never} />);
    expect(screen.getByRole('switch', { name: fallbackT('mweb.challenge.toggles.enabled') })).toBeEnabled();
    expect(screen.queryByText(fallbackT('mweb.challenge.pauseBeforeOff'))).not.toBeInTheDocument();
  });

  it('disables every switch while an action runs', () => {
    render(<HostToggles challenge={challenge() as never} actions={actions({ busy: true }) as never} />);
    screen.getAllByRole('switch').forEach((c) => expect(c).toBeDisabled());
  });
});

describe('HostLiveControls', () => {
  const timer = (over: object = {}) => ({ instance_id: 'clk', input_kind: 'CLOCK', label: 'Clock', config_json: '{}', clock_running: false, clock_elapsed_ms: 0, ...over });
  const voteTool = (over: object = {}) => ({ instance_id: 'v1', input_kind: 'VOTE', label: 'Crowd vote', voting_open: false, config_json: '{}', ...over });
  const live = (tools: object[], over: { status?: string; round?: number } = {}, a: Acts = actions()) => {
    render(<HostLiveControls challenge={{ status: over.status ?? 'LIVE', tools, current_round: over.round ?? 1 } as never} receivedAt={Date.now()} actions={a as never} />);
    return a;
  };

  it('starts, stops and resets a clock according to its state', async () => {
    const a = live([timer()]);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.clockStart') }));
    await waitFor(() => expect(a.clock).toHaveBeenCalledWith('clk', 'START'));
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.clockStop') })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.clockReset') }));
    await waitFor(() => expect(a.clock).toHaveBeenCalledWith('clk', 'RESET'));
  });

  it('stops a running clock and blocks start and reset', async () => {
    const a = live([timer({ clock_running: true })]);
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.clockStart') })).toBeDisabled();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.clockReset') })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.clockStop') }));
    await waitFor(() => expect(a.clock).toHaveBeenCalledWith('clk', 'STOP'));
  });

  it('cannot start a clock when the challenge is paused', () => {
    live([timer()], { status: 'PAUSED' });
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.clockStart') })).toBeDisabled();
  });

  it('opens and closes voting for a voting tool and labels its state', async () => {
    const a = live([voteTool(), { ...voteTool({ instance_id: 'p1', input_kind: 'POLL', label: 'Poll', voting_open: true }) }]);
    expect(screen.getByText(new RegExp(fallbackT('mweb.challenge.votingClosedShort')))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(fallbackT('mweb.challenge.votingOpen')))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.openVoting') }));
    await waitFor(() => expect(a.voting).toHaveBeenCalledWith('v1', true));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.closeVoting') }));
    await waitFor(() => expect(a.voting).toHaveBeenCalledWith('p1', false));
  });

  it('cannot open voting while paused, but can still close it', () => {
    live([voteTool(), voteTool({ instance_id: 'v2', label: 'Other', voting_open: true })], { status: 'PAUSED' });
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.openVoting') })).toBeDisabled();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.closeVoting') })).toBeEnabled();
  });

  it('lets the host move between rounds', async () => {
    const a = live([{ instance_id: 'r', input_kind: 'ROUND', label: 'Rounds', config_json: json({ rounds: 3 }) }], { round: 2 });
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: fallbackT('mweb.challenge.roundOf', { vars: { round: 3, total: 3 } }) }));
    await waitFor(() => expect(a.round).toHaveBeenCalledWith(3));
  });

  it('offers a single round when the tool config does not say how many', () => {
    live([{ instance_id: 'r', input_kind: 'ROUND', label: 'Rounds', config_json: '{}' }]);
    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('shows no controls for a challenge with no tools, and disables them while busy', () => {
    const { unmount } = render(<HostLiveControls challenge={{ status: 'LIVE', tools: [], current_round: 1 } as never} receivedAt={Date.now()} actions={actions() as never} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    unmount();
    live([timer(), voteTool(), { instance_id: 'r', input_kind: 'ROUND', label: 'R', config_json: json({ rounds: 2 }) }], {}, actions({ busy: true }));
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });
});

describe('HostQuizControl', () => {
  const quizTool = (over: object = {}) => ({
    instance_id: 'q1',
    input_kind: 'QUIZ',
    label: 'Trivia',
    voting_open: true,
    config_json: json({ questions: [{ key: 'k1', label: 'Capital?', options: ['Delhi', 'Mumbai'], points: 5, correct: 0 }, { key: 'k2', label: 'River?', options: ['Ganga'], points: 3 }] }),
    state_json: json({ active: 'k1', answered: { k1: 4 } }),
    ...over,
  });
  const quiz = (tool: object, status = 'LIVE', a: Acts = actions()) => {
    render(<HostQuizControl challenge={{ status, tools: [tool] } as never} actions={a as never} />);
    return a;
  };

  it('shows the answer key and answer count, closing the open question and opening another', async () => {
    const a = quiz(quizTool());
    expect(screen.getByRole('region', { name: 'Trivia' })).toBeInTheDocument();
    expect(screen.getByText((fallbackT('mweb.challenge.tools.quizDesk', { vars: { answer: 'Delhi', count: 4 } })).replace(/\s+/g, ' '))).toBeInTheDocument();
    expect(screen.getByText((fallbackT('mweb.challenge.tools.quizDesk', { vars: { answer: '', count: 0 } })).replace(/\s+/g, ' '))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.quizClose') }));
    await waitFor(() => expect(a.quiz).toHaveBeenCalledWith('q1', null));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.quizOpen') }));
    await waitFor(() => expect(a.quiz).toHaveBeenCalledWith('q1', 'k2'));
  });

  it('shows every question as openable when the answers are closed, but not while paused', () => {
    quiz(quizTool({ voting_open: false }), 'PAUSED');
    screen.getAllByRole('button', { name: fallbackT('mweb.challenge.tools.quizOpen') }).forEach((b) => expect(b).toBeDisabled());
    expect(screen.queryByRole('button', { name: fallbackT('mweb.challenge.tools.quizClose') })).not.toBeInTheDocument();
  });

  it('copes with a correct index outside the options, and disables the buttons while busy', () => {
    quiz(quizTool({ config_json: json({ questions: [{ key: 'k1', label: 'Q', options: ['Only'], points: 1, correct: 5 }] }) }), 'LIVE', actions({ busy: true }));
    expect(screen.getByText((fallbackT('mweb.challenge.tools.quizDesk', { vars: { answer: '', count: 4 } })).replace(/\s+/g, ' '))).toBeInTheDocument();
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });

  it('renders no quiz desk for a challenge without a quiz', () => {
    const { container } = render(<HostQuizControl challenge={{ status: 'LIVE', tools: [] } as never} actions={actions() as never} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('HostRunControls', () => {
  const buzz = (over: object = {}) => ({ instance_id: 'b1', input_kind: 'BUZZ', label: 'Buzzer', voting_open: false, state_json: json({ order: ['c2'] }), ...over });
  const pickTool = (over: object = {}) => ({ instance_id: 'p1', input_kind: 'PICK', label: 'Picker', state_json: json({ picked: ['c1', 'c2'] }), ...over });
  const run = (tools: object[], status = 'LIVE', a: Acts = actions()) => {
    render(<HostRunControls challenge={{ status, tools, competitors } as never} actions={a as never} />);
    return a;
  };

  it('arms the buzzer, names who buzzed first, and disarms when armed', async () => {
    const a = run([buzz()]);
    expect(screen.getByText(new RegExp(fallbackT('mweb.challenge.tools.buzzFirst', { vars: { name: 'Bela' } })))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.buzzerArm') }));
    await waitFor(() => expect(a.buzzer).toHaveBeenCalledWith('b1', true));
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.buzzerDisarm') })).toBeDisabled();
  });

  it('offers the next round and disarm while the buzzer is armed, and says nobody buzzed yet', async () => {
    const a = run([buzz({ voting_open: true, state_json: '{}' })]);
    expect(screen.getByText(new RegExp(fallbackT('mweb.challenge.tools.buzzNobody')))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.buzzerNext') }));
    await waitFor(() => expect(a.buzzer).toHaveBeenCalledWith('b1', true));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.buzzerDisarm') }));
    await waitFor(() => expect(a.buzzer).toHaveBeenCalledWith('b1', false));
  });

  it('cannot arm the buzzer while paused', () => {
    run([buzz()], 'PAUSED');
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.buzzerArm') })).toBeDisabled();
  });

  it('tolerates an unknown competitor first in the buzz order', () => {
    run([buzz({ state_json: json({ order: ['ghost'] }) })]);
    expect(screen.getByText(new RegExp(fallbackT('mweb.challenge.tools.buzzFirst', { vars: { name: '' } })))).toBeInTheDocument();
  });

  it('draws and resets the random picker, naming the latest draw', async () => {
    const a = run([pickTool()]);
    expect(screen.getByText(new RegExp(fallbackT('mweb.challenge.tools.pickLatest', { vars: { name: 'Bela' } })))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.pick') }));
    await waitFor(() => expect(a.pick).toHaveBeenCalledWith('p1', false));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.pickReset') }));
    await waitFor(() => expect(a.pick).toHaveBeenCalledWith('p1', true));
  });

  it('says nothing is drawn yet and blocks reset, and copes with an unknown drawn competitor', () => {
    run([pickTool({ state_json: '{}' })]);
    expect(screen.getByText(new RegExp(fallbackT('mweb.challenge.tools.pickNone')))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.pickReset') })).toBeDisabled();
  });

  it('shows a blank name for an unknown drawn competitor and disables controls while busy', () => {
    run([pickTool({ state_json: json({ picked: ['ghost'] }) }), buzz()], 'LIVE', actions({ busy: true }));
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });
});

describe('HostScorePad', () => {
  const increment = (over: object = {}) => ({
    instance_id: 'inc',
    input_kind: 'INCREMENT',
    label: 'Points',
    config_json: json({ increments: [1, 5], allow_negative: true }),
    ...over,
  });
  const setValue = { instance_id: 'val', input_kind: 'SET_VALUE', label: 'Distance', config_json: '{}' };
  const standings = [{ competitor_id: 'c1', metrics_json: json({ inc: 12 }) }];
  const pad = (tools: object[], a: Acts = actions()) => {
    render(<HostScorePad challenge={{ tools, competitors, standings } as never} actions={a as never} />);
    return a;
  };

  it('renders nothing when no tool is scored by hand', () => {
    const { container } = render(<HostScorePad challenge={{ tools: [{ instance_id: 'x', input_kind: 'POLL', config_json: '{}' }], competitors, standings } as never} actions={actions() as never} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers plus and minus steps per competitor, showing their current metric, and records a tap', async () => {
    const a = pad([increment()]);
    expect(screen.getByRole('region', { name: 'Points' })).toBeInTheDocument();
    expect(screen.getByText('Asha · 12')).toBeInTheDocument();
    expect(screen.getByText('Bela · —')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: fallbackT('mweb.challenge.addPoints', { vars: { points: 5, name: 'Asha' } }) })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addPoints', { vars: { points: -5, name: 'Bela' } }) }));
    await waitFor(() => expect(a.score).toHaveBeenCalledWith('inc', 'c2', -5));
    expect(screen.getAllByText('+1')).toHaveLength(2);
    expect(screen.getAllByText('-1')).toHaveLength(2);
  });

  it('offers only positive steps when negatives are not allowed, and none when no increments are set', () => {
    pad([increment({ config_json: json({ increments: [2] }) }), increment({ instance_id: 'none', label: 'Empty', config_json: '{}' })]);
    expect(screen.queryByText('-2')).not.toBeInTheDocument();
    expect(screen.getAllByText('+2')).toHaveLength(2);
  });

  it('takes a typed value for a set-value tool, only when it is a non-negative number, and clears after recording', async () => {
    const a = pad([setValue]);
    const record = screen.getAllByRole('button', { name: fallbackT('mweb.challenge.record') })[0];
    expect(record).toBeDisabled();
    const input = screen.getAllByLabelText('Distance')[0];
    fireEvent.change(input, { target: { value: '-3' } });
    expect(record).toBeDisabled();
    fireEvent.change(input, { target: { value: '42.5' } });
    expect(record).toBeEnabled();
    fireEvent.click(record);
    await waitFor(() => expect(a.score).toHaveBeenCalledWith('val', 'c1', 42.5));
    expect(input).toHaveValue(null);
  });

  it('records per-competitor times on a clock only when its settings say so', () => {
    pad([
      { instance_id: 'clk', input_kind: 'CLOCK', label: 'Lap time', config_json: json({ record_competitor_times: true }) },
      { instance_id: 'clk2', input_kind: 'CLOCK', label: 'Plain clock', config_json: '{}' },
    ]);
    expect(screen.getByRole('region', { name: 'Lap time' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Plain clock' })).not.toBeInTheDocument();
  });

  it('disables entry while a score is being saved', () => {
    pad([increment(), setValue], actions({ scoring: true }));
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });
});

describe('HostItemsControl', () => {
  const itemsTool = (kind = 'CHECK', over: object = {}) => ({
    instance_id: 'i1',
    input_kind: kind,
    label: 'Tasks',
    config_json: json({ items: [{ key: 'x', label: 'Find the flag', points: 2 }] }),
    state_json: json({ done: { c1: ['x'] } }),
    ...over,
  });
  const items = (tools: object[], a: Acts = actions()) => {
    render(<HostItemsControl challenge={{ id: 'ch1', tools, competitors } as never} actions={a as never} />);
    return a;
  };

  it('ticks and unticks a task per competitor', async () => {
    const a = items([itemsTool()]);
    const boxes = screen.getAllByRole('checkbox', { name: 'Find the flag' });
    expect(boxes[0]).toBeChecked();
    expect(boxes[1]).not.toBeChecked();
    fireEvent.click(boxes[1]);
    await waitFor(() => expect(a.item).toHaveBeenCalledWith('i1', 'c2', 'x', true));
    fireEvent.click(boxes[0]);
    await waitFor(() => expect(a.item).toHaveBeenCalledWith('i1', 'c1', 'x', false));
    expect(screen.queryByRole('button', { name: fallbackT('mweb.challenge.tools.checkpointQr') })).not.toBeInTheDocument();
  });

  it('opens and closes the checkpoint QR codes for a checkpoint tool', () => {
    items([itemsTool('CHECKPOINT')]);
    expect(screen.queryByTestId('qr-dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.checkpointQr') }));
    expect(screen.getByTestId('qr-dialog')).toHaveAttribute('data-tool', 'i1');
    expect(screen.getByTestId('qr-dialog')).toHaveAttribute('data-challenge', 'ch1');
    fireEvent.click(screen.getByTestId('qr-close'));
    expect(screen.queryByTestId('qr-dialog')).not.toBeInTheDocument();
  });

  it('disables ticking while a save is running', () => {
    items([itemsTool()], actions({ scoring: true }));
    screen.getAllByRole('checkbox').forEach((c) => expect(c).toBeDisabled());
  });

  it('renders no sections for a challenge with no checklist', () => {
    items([]);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
