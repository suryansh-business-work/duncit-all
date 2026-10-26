import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import ChallengeGallery from '../ChallengeGallery';
import ChallengeSubmissionPanel from '../ChallengeSubmissionPanel';
import LiveChallengeCard from '../LiveChallengeCard';
import PodChallengesSection from '../PodChallengesSection';
import { SubmissionForm } from '../submission-form';
import { buildSubmissionSchema } from '../submission-form/submission.types';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  confirm: vi.fn(),
  upload: vi.fn(),
  uploading: { current: false },
  gate: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  live: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock('@duncit/dialogs', async (orig) => ({ ...(await orig<object>()), useConfirm: () => h.confirm }));
vi.mock('../../../utils/imagekit', () => ({ useImagekitUpload: () => ({ upload: h.upload, uploading: h.uploading.current }) }));
vi.mock('../../../utils/uploadLimits', () => ({ useAttachmentGate: () => h.gate }));
vi.mock('../../notify', () => ({ notifyError: h.error, notifySuccess: vi.fn() }));
vi.mock('../usePodChallengeLive', () => ({ usePodChallengeLive: h.live }));
vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery }));
vi.mock('../../ErrorBoundary', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../ShareChallengeButton', () => ({ default: () => <span data-testid="share" /> }));
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDateTime: (d: string) => `at:${d}` }),
}));
vi.mock('@duncit/logs', async (orig) => {
  const real = await orig<typeof import('@duncit/logs')>();
  return { ...real, logs: { ...real.logs, mWeb: { ...real.logs.mWeb, warn: h.warn } } };
});

const competitors = [
  { competitor_id: 'c1', name: 'Asha' },
  { competitor_id: 'c2', name: 'Bela' },
];

const entry = (over: object = {}) => ({ id: 'e1', competitor_id: 'c1', media_url: 'https://img/a.jpg', media_type: 'IMAGE', caption: 'Look', ...over });

const file = (name = 'a.png', type = 'image/png') => new File(['x'], name, { type });

beforeEach(() => {
  vi.clearAllMocks();
  h.uploading.current = false;
  h.gate.mockReturnValue(null);
});

describe('ChallengeGallery', () => {
  const gallery = (entries: object[], canRemove = () => false, busy = false) => {
    const onRemove = vi.fn();
    render(<ChallengeGallery entries={entries as never} names={new Map(competitors.map((c) => [c.competitor_id, c.name]))} canRemove={canRemove} onRemove={onRemove} busy={busy} />);
    return onRemove;
  };

  it('says there are no submissions yet', () => {
    gallery([]);
    expect(screen.getByText(fallbackT('mweb.challenge.tools.noSubmissions'))).toBeInTheDocument();
  });

  it('shows a photo inline with its owner and caption, and no remove control when not allowed', () => {
    gallery([entry()]);
    expect(screen.getByRole('img', { name: fallbackT('mweb.challenge.tools.entryBy', { vars: { name: 'Asha' } }) })).toHaveAttribute('src', 'https://img/a.jpg');
    expect(screen.getByText('Look')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('links a video and an audio piece to their own players, and omits an empty caption', () => {
    gallery([entry({ id: 'v', media_type: 'VIDEO', media_url: 'https://ik.io/v.mp4', caption: '' }), entry({ id: 'a', competitor_id: 'c2', media_type: 'AUDIO', media_url: 'https://cdn/a.mp3', caption: '' })]);
    const video = screen.getByRole('link', { name: fallbackT('mweb.challenge.tools.playVideo', { vars: { name: 'Asha' } }) });
    expect(video).toHaveAttribute('target', '_blank');
    expect(video).toHaveAttribute('href', expect.stringContaining('v.mp4'));
    expect(screen.getByRole('link', { name: fallbackT('mweb.challenge.tools.playAudio', { vars: { name: 'Bela' } }) })).toHaveAttribute('href', 'https://cdn/a.mp3');
  });

  it('removes an entry the viewer may remove, disabling the control while busy', () => {
    const onRemove = gallery([entry()], () => true);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.removeEntry', { vars: { name: 'Asha' } }) }));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }));
  });

  it('disables removal while an action runs and tolerates an unknown competitor', () => {
    gallery([entry({ competitor_id: 'ghost' })], () => true, true);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('SubmissionForm', () => {
  const form = (over: Partial<Parameters<typeof SubmissionForm>[0]> = {}) => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const utils = render(<SubmissionForm accepted={['IMAGE']} allowCaption replacing={false} saving={false} onSubmit={onSubmit} {...over} />);
    const input = utils.container.querySelector('input[type="file"]') as HTMLInputElement;
    return { onSubmit, input, ...utils };
  };
  const pick = (input: HTMLInputElement, f: File) => fireEvent.change(input, { target: { files: [f] } });

  it('asks for a file first', async () => {
    const { onSubmit } = form();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.submit') }));
    expect(await screen.findByText(fallbackT('mweb.challenge.tools.errors.file'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a file of a kind the tool does not take', async () => {
    const { input, onSubmit } = form();
    pick(input, file('a.mp3', 'audio/mpeg'));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.submit') }));
    expect(await screen.findByText(fallbackT('mweb.challenge.tools.errors.fileType'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a file with no recognisable type', async () => {
    const { input } = form();
    pick(input, file('a.bin', ''));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.submit') }));
    expect(await screen.findByText(fallbackT('mweb.challenge.tools.errors.fileType'))).toBeInTheDocument();
  });

  it('rejects a file over the upload limit with the gate message', async () => {
    h.gate.mockReturnValue('Image is too large (max 5 MB)');
    const { input } = form();
    pick(input, file());
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.submit') }));
    expect(await screen.findByText('Image is too large (max 5 MB)')).toBeInTheDocument();
  });

  it('rejects an over-long caption', async () => {
    const { input } = form();
    pick(input, file());
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.challenge.tools.caption')), { target: { value: 'x'.repeat(201) } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.submit') }));
    expect(await screen.findByText(fallbackT('mweb.challenge.tools.errors.caption', { vars: { max: 200 } }))).toBeInTheDocument();
  });

  it('shows the chosen file, offers to replace it, submits a trimmed caption and clears afterwards', async () => {
    const { input, onSubmit } = form();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.chooseFile') })).toBeInTheDocument();
    const f = file('piece.png');
    pick(input, f);
    expect(await screen.findByText(fallbackT('mweb.challenge.tools.fileChosen', { vars: { name: 'piece.png' } }))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.replaceFile') })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.challenge.tools.caption')), { target: { value: '  My piece  ' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.submit') }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ file: f, caption: 'My piece', competitor_id: '' }));
    await waitFor(() => expect(screen.queryByText(fallbackT('mweb.challenge.tools.fileChosen', { vars: { name: 'piece.png' } }))).not.toBeInTheDocument());
  });

  it('keeps the file when the save was not accepted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    const { input } = form({ onSubmit });
    pick(input, file('piece.png'));
    fireEvent.click(await screen.findByRole('button', { name: fallbackT('mweb.challenge.tools.submit') }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.getByText(fallbackT('mweb.challenge.tools.fileChosen', { vars: { name: 'piece.png' } }))).toBeInTheDocument();
  });

  it('opens the hidden picker from the button and only accepts the tool media kinds', () => {
    const { input } = form({ accepted: ['IMAGE', 'VIDEO'] });
    expect(input).toHaveAttribute('accept', 'image/*,video/*');
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.chooseFile') }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('ignores a cancelled file dialog', () => {
    const { input } = form();
    fireEvent.change(input, { target: { files: [] } });
    expect(screen.queryByText(/fileChosen/)).not.toBeInTheDocument();
  });

  it('says it replaces an existing entry, and Uploading while saving', () => {
    const { rerender, onSubmit } = form({ replacing: true });
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.submitReplace') })).toBeInTheDocument();
    rerender(<SubmissionForm accepted={['IMAGE']} allowCaption replacing saving onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.uploading') })).toBeDisabled();
  });

  it('hides the caption when the tool turns it off', () => {
    form({ allowCaption: false });
    expect(screen.queryByLabelText(fallbackT('mweb.challenge.tools.caption'))).not.toBeInTheDocument();
  });

  it('makes a host pick whose behalf they submit on', async () => {
    const { input, onSubmit } = form({ competitors });
    pick(input, file());
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.submit') }));
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.pickCompetitor'))).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Bela' }));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.submit') }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ competitor_id: 'c2' })));
  });

  it('builds a schema that only needs a competitor when asked to', () => {
    const rules = { accepted: ['IMAGE' as const], pickCompetitor: false, tooLarge: () => null };
    const t = (key: string) => key;
    const base = { file: file(), caption: 'ok', competitor_id: '' };
    expect(buildSubmissionSchema(t, rules).safeParse(base).success).toBe(true);
    expect(buildSubmissionSchema(t, { ...rules, pickCompetitor: true }).safeParse(base).success).toBe(false);
    expect(buildSubmissionSchema(t, rules).safeParse({ ...base, file: null }).success).toBe(false);
  });
});

describe('ChallengeSubmissionPanel', () => {
  const tool = (over: object = {}) => ({ instance_id: 't1', label: 'Photos', config_json: '{}', state_json: JSON.stringify({ entries: [entry()] }), input_kind: 'SUBMIT', ...over }) as never;
  const actions = (over: object = {}) => ({ busy: false, submit: vi.fn().mockResolvedValue(true), removeEntry: vi.fn().mockResolvedValue(true), ...over });
  const challenge = (over: { status?: string; viewer?: object } = {}) =>
    ({ id: 'ch1', status: over.status ?? 'LIVE', competitors, viewer: { can_manage: false, my_competitor_id: 'c1', ...over.viewer } }) as never;
  const panel = (props: { challenge?: never; tool?: never; actions?: object; interactive?: boolean } = {}) => {
    const a = props.actions ?? actions();
    render(<ChallengeSubmissionPanel challenge={props.challenge ?? challenge()} tool={props.tool ?? tool()} actions={a as never} interactive={props.interactive ?? true} />);
    return a as ReturnType<typeof actions>;
  };

  it('lets a competitor with an entry replace it, uploading the file and submitting as themselves', async () => {
    h.upload.mockResolvedValue('https://ik/new.png');
    const a = panel();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.submitReplace') })).toBeInTheDocument();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const f = file('new.png');
    fireEvent.change(input, { target: { files: [f] } });
    fireEvent.click(await screen.findByRole('button', { name: fallbackT('mweb.challenge.tools.submitReplace') }));
    await waitFor(() => expect(a.submit).toHaveBeenCalledTimes(1));
    expect(h.upload).toHaveBeenCalledWith(f, '/challenge-submissions');
    expect(a.submit).toHaveBeenCalledWith('t1', { media_url: 'https://ik/new.png', media_type: 'IMAGE', caption: '', competitor_id: null });
  });

  it('lets a host submit on a competitor behalf', async () => {
    h.upload.mockResolvedValue('https://ik/x.png');
    const a = panel({ challenge: challenge({ viewer: { can_manage: true, my_competitor_id: null } }), tool: tool({ state_json: '{}' }) });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file()] } });
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'Bela' }));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.submit') }));
    await waitFor(() => expect(a.submit).toHaveBeenCalledWith('t1', expect.objectContaining({ competitor_id: 'c2', media_type: 'IMAGE' })));
  });

  it('logs and shows an upload failure, and keeps the form', async () => {
    h.upload.mockRejectedValue(new Error('Upload blocked'));
    const a = panel({ tool: tool({ state_json: '{}' }) });
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file()] } });
    fireEvent.click(await screen.findByRole('button', { name: fallbackT('mweb.challenge.tools.submit') }));
    await waitFor(() => expect(h.error).toHaveBeenCalledWith('Upload blocked'));
    expect(h.warn).toHaveBeenCalledWith('pod-challenge', 'submission-upload', expect.any(Object));
    expect(a.submit).not.toHaveBeenCalled();
  });

  it('shows no form to a spectator, on a projector or once the challenge is not open', () => {
    const { unmount } = render(<ChallengeSubmissionPanel challenge={challenge({ viewer: { my_competitor_id: null } })} tool={tool()} actions={actions() as never} interactive />);
    expect(document.querySelector('form')).toBeNull();
    unmount();
    const second = render(<ChallengeSubmissionPanel challenge={challenge()} tool={tool()} actions={actions() as never} interactive={false} />);
    expect(document.querySelector('form')).toBeNull();
    second.unmount();
    render(<ChallengeSubmissionPanel challenge={challenge({ status: 'PAUSED' })} tool={tool()} actions={actions() as never} interactive />);
    expect(document.querySelector('form')).toBeNull();
  });

  it('lets a competitor remove their own entry after confirming, and not someone else', async () => {
    h.confirm.mockResolvedValue(true);
    const a = panel({ tool: tool({ state_json: JSON.stringify({ entries: [entry(), entry({ id: 'e2', competitor_id: 'c2' })] }) }) });
    expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.removeEntry', { vars: { name: 'Asha' } }) }));
    await waitFor(() => expect(a.removeEntry).toHaveBeenCalledWith('e1'));
    expect(h.confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true, title: fallbackT('mweb.challenge.tools.removeEntryTitle') }));
  });

  it('does nothing when the removal is not confirmed', async () => {
    h.confirm.mockResolvedValue(false);
    const a = panel();
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    await waitFor(() => expect(h.confirm).toHaveBeenCalled());
    expect(a.removeEntry).not.toHaveBeenCalled();
  });

  it('lets a host remove any entry until the result is archived, but not a competitor once the challenge has closed', () => {
    const entries = JSON.stringify({ entries: [entry(), entry({ id: 'e2', competitor_id: 'c2' })] });
    const { unmount } = render(<ChallengeSubmissionPanel challenge={challenge({ status: 'COMPLETED', viewer: { can_manage: true } })} tool={tool({ state_json: entries })} actions={actions() as never} interactive />);
    expect(screen.getAllByRole('button', { name: /remove/i })).toHaveLength(2);
    unmount();
    const archived = render(<ChallengeSubmissionPanel challenge={challenge({ status: 'ARCHIVED', viewer: { can_manage: true } })} tool={tool({ state_json: entries })} actions={actions() as never} interactive />);
    expect(screen.queryAllByRole('button', { name: /remove/i })).toHaveLength(0);
    archived.unmount();
    render(<ChallengeSubmissionPanel challenge={challenge({ status: 'COMPLETED' })} tool={tool({ state_json: entries })} actions={actions() as never} interactive />);
    expect(screen.queryAllByRole('button', { name: /remove/i })).toHaveLength(0);
  });

  it('honours the host-fixed media kind and a disabled caption', () => {
    panel({ tool: tool({ config_json: '{"media_kind":"VIDEO","allow_caption":false}', state_json: '{}' }) });
    expect(document.querySelector('input[type="file"]')).toHaveAttribute('accept', 'video/*');
    expect(screen.queryByLabelText(fallbackT('mweb.challenge.tools.caption'))).not.toBeInTheDocument();
  });

  it('does not upload or submit when the form blocks a missing file', async () => {
    const a = panel({ tool: tool({ state_json: '{}' }) });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.submit') }));
    expect(await screen.findByText(fallbackT('mweb.challenge.tools.errors.file'))).toBeInTheDocument();
    expect(a.submit).not.toHaveBeenCalled();
    expect(h.upload).not.toHaveBeenCalled();
  });

  it('names nobody in the removal prompt when the entry competitor is no longer on the challenge', async () => {
    h.confirm.mockResolvedValue(false);
    panel({ challenge: challenge({ viewer: { can_manage: true } }), tool: tool({ state_json: JSON.stringify({ entries: [entry({ competitor_id: 'ghost' })] }) }) });
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    await waitFor(() => expect(h.confirm).toHaveBeenCalledWith(expect.objectContaining({ message: fallbackT('mweb.challenge.tools.removeEntryBody', { vars: { name: '' } }) })));
  });
});

describe('LiveChallengeCard', () => {
  const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
  const challenge = (over: object = {}) => ({
    id: 'ch1',
    pod_id: 'p1',
    name: 'Quiz night',
    status: 'LIVE',
    updated_at: '2026-06-01T10:00:00.000Z',
    standings: [
      { competitor_id: 'c1', name: 'A', rank: 1, total: 9 },
      { competitor_id: 'c2', name: 'B', rank: 2, total: 8 },
      { competitor_id: 'c3', name: 'C', rank: 3, total: 7 },
      { competitor_id: 'c4', name: 'D', rank: 4, total: 6 },
    ],
    tools: [{ input_kind: 'CLOCK', label: 'Clock', config_json: '{}', clock_running: false, clock_elapsed_ms: 0 }],
    result: null,
    ...over,
  });
  const card = (view: object | null) => {
    h.live.mockReturnValue({ challenge: view, receivedAt: Date.now() });
    return render(
      <MemoryRouter initialEntries={['/start']}>
        <Routes>
          <Route path="/start" element={<LiveChallengeCard challengeId="ch1" />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders nothing until the challenge has loaded', () => {
    card(null);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('shows the live preview: status, name, clock, the top three, last update, and links to the arena', () => {
    card(challenge());
    expect(screen.getByRole('region', { name: 'Quiz night' })).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.challenge.status.LIVE'))).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText(fallbackT('mweb.challenge.lastUpdated', { vars: { time: 'at:2026-06-01T10:00:00.000Z' } }))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.viewLive') }));
    expect(screen.getByTestId('where')).toHaveTextContent('/pod/p1/challenges/ch1/live');
  });

  it('shows a paused challenge without the live colour and without a clock when there is none', () => {
    card(challenge({ status: 'PAUSED', tools: [] }));
    expect(screen.getByText(fallbackT('mweb.challenge.status.PAUSED'))).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('falls back to the raw status for one with no label key', () => {
    card(challenge({ status: 'WEIRD', tools: [] }));
    expect(screen.getByText('WEIRD')).toBeInTheDocument();
  });

  it('swaps in the final result once the challenge is finished, and nothing if none was published', () => {
    const { unmount } = card(
      challenge({ status: 'COMPLETED', result: { version: 1, published_at: '2026-06-01T11:00:00.000Z', reason: '', winner_ids: ['c1'], standings: [{ competitor_id: 'c1', name: 'A', rank: 1, total: 9 }] } })
    );
    expect(screen.getByText(fallbackT('mweb.challenge.completed'))).toBeInTheDocument();
    unmount();
    card(challenge({ status: 'COMPLETED', result: null }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});

describe('PodChallengesSection', () => {
  const sectionWith = (challenges: object[] | undefined, finishedOnly = false) => {
    const polling = { startPolling: vi.fn(), stopPolling: vi.fn() };
    h.useQuery.mockReturnValue({ data: challenges ? { podChallenges: challenges } : undefined, ...polling });
    h.live.mockImplementation((id: string) => ({
      challenge: { id, pod_id: 'p1', name: `Live ${id}`, status: 'LIVE', updated_at: '2026-06-01T10:00:00.000Z', standings: [], tools: [], result: null },
      receivedAt: Date.now(),
    }));
    const utils = render(
      <MemoryRouter>
        <PodChallengesSection podId="p1" finishedOnly={finishedOnly} />
      </MemoryRouter>
    );
    return { ...utils, ...polling };
  };
  const finishedResult = { version: 1, published_at: '2026-06-01T11:00:00.000Z', reason: '', winner_ids: ['c1'], standings: [{ competitor_id: 'c1', name: 'A', rank: 1, total: 9 }] };
  const row = (id: string, status: string, over: object = {}) => ({ id, pod_id: 'p1', name: `C ${id}`, status, show_on_pod_details: true, result: null, ...over });

  it('renders nothing when there is nothing to show, and does not poll', () => {
    const { container, startPolling } = sectionWith([row('a', 'DRAFT')]);
    expect(container).toBeEmptyDOMElement();
    expect(startPolling).not.toHaveBeenCalled();
  });

  it('renders nothing with no data and skips the query without a pod id', () => {
    const { container } = sectionWith(undefined);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a live card for an in-play challenge and polls the list while one may still start or end', () => {
    const { startPolling, unmount, stopPolling } = sectionWith([row('a', 'LIVE'), row('b', 'SCHEDULED')]);
    expect(screen.getByTestId('pod-challenges')).toBeInTheDocument();
    expect(screen.getAllByRole('region')).toHaveLength(1);
    expect(startPolling).toHaveBeenCalledWith(30_000);
    unmount();
    expect(stopPolling).toHaveBeenCalled();
  });

  it('hides an in-play challenge the host has not shown on Pod Details', () => {
    const { container } = sectionWith([row('a', 'LIVE', { show_on_pod_details: false })]);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the final result of a finished challenge', () => {
    sectionWith([row('a', 'COMPLETED', { result: finishedResult }), row('b', 'ARCHIVED', { result: null })]);
    expect(screen.getAllByText(fallbackT('mweb.challenge.completed'))).toHaveLength(1);
  });

  it('shows only finished results in pod history, with no live cards and no polling', () => {
    const { startPolling } = sectionWith([row('a', 'LIVE'), row('b', 'COMPLETED', { result: finishedResult })], true);
    expect(screen.getAllByRole('region')).toHaveLength(1);
    expect(screen.getByText(fallbackT('mweb.challenge.completed'))).toBeInTheDocument();
    expect(startPolling).not.toHaveBeenCalled();
  });
});
