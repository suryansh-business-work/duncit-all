import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

import HostScoreLog from '../HostScoreLog';
import HostNotifications from '../HostNotifications';
import HostResultPanel from '../HostResultPanel';
import HostRosterDialog from '../HostRosterDialog';
import CheckpointLinksDialog from '../CheckpointLinksDialog';
import HostChallengePanel from '../HostChallengePanel';
import HostPodChallengesPage from '../index';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  confirm: vi.fn(),
  live: vi.fn(),
  actions: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery, useMutation: h.useMutation }));
vi.mock('../../../components/notify', () => ({ notifySuccess: h.success, notifyError: h.error }));
vi.mock('@duncit/dialogs', async (orig) => ({ ...(await orig<object>()), useConfirm: () => h.confirm }));
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDateTime: (d: string) => `at:${d}` }),
}));
vi.mock('@duncit/logs', async (orig) => {
  const real = await orig<typeof import('@duncit/logs')>();
  return { ...real, logs: { ...real.logs, mWeb: { ...real.logs.mWeb, warn: h.warn } } };
});
vi.mock('../../../components/pod-challenge/usePodChallengeLive', () => ({ usePodChallengeLive: h.live }));
vi.mock('../useHostChallengeActions', () => ({ useHostChallengeActions: h.actions }));
vi.mock('../../../components/pod-challenge/ChallengeToolPanels', () => ({ default: (p: { only?: string[] }) => <div data-testid="tool-panels" data-only={(p.only ?? []).join(',')} /> }));
vi.mock('../../../components/pod-challenge/ShareChallengeButton', () => ({ default: () => <span data-testid="share" /> }));
vi.mock('../../../components/pod-challenge/ChallengeResultCard', () => ({ default: () => <div data-testid="result-card" /> }));
vi.mock('../../../components/pod-challenge/ChallengeClock', () => ({ default: () => <span /> }));
vi.mock('../HostLiveControls', () => ({ default: () => <div data-testid="live-controls" /> }));
vi.mock('../HostQuizControl', () => ({ default: () => <div data-testid="quiz-control" /> }));
vi.mock('../HostRunControls', () => ({ default: () => <div data-testid="run-controls" /> }));
vi.mock('../HostScorePad', () => ({ default: () => <div data-testid="score-pad" /> }));
vi.mock('../HostItemsControl', () => ({ default: () => <div data-testid="items-control" /> }));
vi.mock('../HostLifecycle', () => ({ default: () => <div data-testid="lifecycle" /> }));
vi.mock('../HostToggles', () => ({ default: () => <div data-testid="toggles" /> }));

const competitors = [{ competitor_id: 'c1', name: 'Asha', user_id: 'u1' }];

const acts = (over: object = {}) => ({
  busy: false,
  scoring: false,
  voidScore: vi.fn().mockResolvedValue(true),
  publish: vi.fn().mockResolvedValue(true),
  roster: vi.fn().mockResolvedValue(true),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.confirm.mockResolvedValue(true);
});

describe('HostScoreLog', () => {
  const entry = (over: object = {}) => ({ id: 's1', tool_instance_id: 't1', competitor_id: 'c1', value: 5, voided: false, void_reason: '', created_at: '2026-06-01T10:00:00.000Z', ...over });
  const log = (entries: object[] | undefined, status = 'LIVE', a = acts()) => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    h.useQuery.mockReturnValue({ data: entries ? { podChallengeScoreLog: entries } : undefined, refetch });
    const utils = render(<HostScoreLog challenge={{ id: 'ch1', status, revision: 1, tools: [{ instance_id: 't1', label: 'Points' }], competitors } as never} actions={a as never} />);
    return { a, refetch, ...utils };
  };

  it('says there are no scores yet', () => {
    log([]);
    expect(screen.getByText(fallbackT('mweb.challenge.noScores'))).toBeInTheDocument();
  });

  it('says there are no scores yet when the log has not loaded', () => {
    log(undefined);
    expect(screen.getByText(fallbackT('mweb.challenge.noScores'))).toBeInTheDocument();
  });

  it('lists each entry with competitor, tool, value and time, and shows a voided one struck through with its reason', () => {
    log([entry(), entry({ id: 's2', voided: true, void_reason: 'typo' }), entry({ id: 's3', voided: true, void_reason: '' })]);
    const label = fallbackT('mweb.challenge.logEntry', { vars: { name: 'Asha', tool: 'Points', value: 5 } });
    expect(screen.getAllByText(label)).toHaveLength(3);
    expect(screen.getByText('at:2026-06-01T10:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.challenge.removed', { vars: { reason: 'typo' } }))).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.challenge.removed', { vars: { reason: '—' } }))).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: new RegExp(fallbackT('mweb.challenge.removeScore')) })).toHaveLength(1);
  });

  it('falls back to a dash for an unknown competitor or tool', () => {
    log([entry({ competitor_id: 'ghost', tool_instance_id: 'gone' })]);
    expect(screen.getByText(fallbackT('mweb.challenge.logEntry', { vars: { name: '—', tool: '—', value: 5 } }))).toBeInTheDocument();
  });

  it('re-reads when the revision changes, logging a failed refetch', async () => {
    const { refetch, rerender } = log([entry()]);
    expect(refetch).toHaveBeenCalledTimes(1);
    refetch.mockRejectedValueOnce(new Error('offline'));
    rerender(<HostScoreLog challenge={{ id: 'ch1', status: 'LIVE', revision: 2, tools: [], competitors } as never} actions={acts() as never} />);
    await waitFor(() => expect(h.warn).toHaveBeenCalledWith('host-pod-challenges', 'scoreLog', expect.any(Object)));
  });

  it('removes a score during play without needing a reason, and closes the dialog', async () => {
    const { a } = log([entry()]);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(fallbackT('mweb.challenge.removeScore')) }));
    expect(await screen.findByText(fallbackT('mweb.challenge.removeScoreBody'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.removeScore') }));
    await waitFor(() => expect(a.voidScore).toHaveBeenCalledWith('s1', undefined));
    await waitFor(() => expect(screen.queryByText(fallbackT('mweb.challenge.removeScoreBody'))).not.toBeInTheDocument());
  });

  it('needs a reason once the challenge is over, and sends it', async () => {
    const { a } = log([entry()], 'COMPLETED');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(fallbackT('mweb.challenge.removeScore')) }));
    expect(await screen.findByText(fallbackT('mweb.challenge.removeScoreCorrection'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.removeScore') }));
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.reason'))).toBeInTheDocument();
    expect(a.voidScore).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(new RegExp(fallbackT('mweb.challenge.fields.reason'))), { target: { value: 'Wrong judge' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.removeScore') }));
    await waitFor(() => expect(a.voidScore).toHaveBeenCalledWith('s1', 'Wrong judge'));
  });

  it('keeps the dialog open when the removal is refused, and can be cancelled', async () => {
    const { a } = log([entry()], 'LIVE', acts({ voidScore: vi.fn().mockResolvedValue(false) }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(fallbackT('mweb.challenge.removeScore')) }));
    fireEvent.click(await screen.findByRole('button', { name: fallbackT('mweb.challenge.removeScore') }));
    await waitFor(() => expect(a.voidScore).toHaveBeenCalled());
    expect(screen.getByText(fallbackT('mweb.challenge.removeScoreBody'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.cancel') }));
    await waitFor(() => expect(screen.queryByText(fallbackT('mweb.challenge.removeScoreBody'))).not.toBeInTheDocument());
  });

  it('disables removal while a score is being saved', () => {
    log([entry()], 'LIVE', acts({ scoring: true }));
    expect(screen.getByRole('button', { name: new RegExp(fallbackT('mweb.challenge.removeScore')) })).toBeDisabled();
  });
});

describe('HostNotifications', () => {
  const batch = (over: object = {}) => ({ kind: 'LIVE', version: 1, recipients: 4, whatsapp: 3, email: 1, last_sent_at: '2026-06-01T10:00:00.000Z', ...over });
  const setup = (challenge: object, batches: object[] | undefined, send = vi.fn().mockResolvedValue({ data: { sendPodChallengeNotice: 3 } }), loading = false) => {
    h.useQuery.mockReturnValue({ data: batches ? { podChallengeNotifications: batches } : undefined });
    h.useMutation.mockReturnValue([send, { loading }]);
    render(<HostNotifications challenge={{ id: 'ch1', status: 'LIVE', result: null, ...challenge } as never} />);
    return send;
  };

  it('says nothing has been sent yet, and sends the live link while the challenge runs', async () => {
    const send = setup({}, []);
    expect(screen.getByText(fallbackT('mweb.challenge.noNotices'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.resendFailed') })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.sendLiveNow') }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({ variables: { id: 'ch1', kind: 'LIVE', retryFailed: false } }));
    expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.challenge.noticeSent', { vars: { count: 3 } }));
  });

  it('says nobody was left to notify when the count is zero or missing', async () => {
    setup({}, [], vi.fn().mockResolvedValue({ data: { sendPodChallengeNotice: 0 } }));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.sendLiveNow') }));
    await waitFor(() => expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.challenge.noticeNobody', { vars: { count: 0 } })));
  });

  it('treats a missing answer as nobody', async () => {
    setup({}, undefined, vi.fn().mockResolvedValue({ data: undefined }));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.sendLiveNow') }));
    await waitFor(() => expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.challenge.noticeNobody', { vars: { count: 0 } })));
  });

  it('retries failed sends once a notice of this kind went out, listing the history with its channels', async () => {
    const send = setup({}, [batch(), batch({ kind: 'RESULT', version: 2, recipients: 2 })]);
    expect(screen.getByRole('list', { name: fallbackT('mweb.challenge.noticeHistory') })).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.challenge.noticeLive', { vars: { count: 4 } }))).toBeInTheDocument();
    expect(screen.getByText(fallbackT('mweb.challenge.noticeResult', { vars: { count: 2 } }))).toBeInTheDocument();
    expect(screen.getAllByText(fallbackT('mweb.challenge.noticeChannels', { vars: { whatsapp: 3, email: 1, time: 'at:2026-06-01T10:00:00.000Z' } }))).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.resendFailed') }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({ variables: { id: 'ch1', kind: 'LIVE', retryFailed: true } }));
  });

  it('sends the result link once a result is published, even for a finished challenge', async () => {
    const send = setup({ status: 'COMPLETED', result: { version: 1 } }, []);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.sendResultNow') }));
    await waitFor(() => expect(send).toHaveBeenCalledWith({ variables: { id: 'ch1', kind: 'RESULT', retryFailed: false } }));
  });

  it('blocks sending while a challenge is not in play and has no result, or while a send runs', () => {
    setup({ status: 'SCHEDULED' }, []);
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.sendLiveNow') })).toBeDisabled();
  });

  it('blocks both buttons while a send is running', () => {
    setup({}, [batch()], undefined, true);
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.sendLiveNow') })).toBeDisabled();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.resendFailed') })).toBeDisabled();
  });

  it('shows the server reason when sending is refused', async () => {
    setup({}, [], vi.fn().mockRejectedValue(new Error('WhatsApp is off')));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.sendLiveNow') }));
    await waitFor(() => expect(h.error).toHaveBeenCalledWith('WhatsApp is off'));
  });
});

describe('HostResultPanel', () => {
  const base = { id: 'ch1', pod_id: 'p1', name: 'Quiz night', status: 'COMPLETED', standings: [{ competitor_id: 'c1', name: 'Asha', rank: 1, total: 9 }], result: null, viewer: { is_staff: false } };
  const panel = (over: object = {}, a = acts()) => {
    render(<HostResultPanel challenge={{ ...base, ...over } as never} actions={a as never} />);
    return a;
  };

  it('shows the standings for review and publishes after confirming', async () => {
    const a = panel();
    expect(screen.getByText(fallbackT('mweb.challenge.reviewBeforePublish'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.finalizePublish') }));
    await waitFor(() => expect(a.publish).toHaveBeenCalledWith());
    expect(h.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: fallbackT('mweb.challenge.publishTitle') }));
  });

  it('does not publish when the host backs out', async () => {
    h.confirm.mockResolvedValue(false);
    const a = panel();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.finalizePublish') }));
    await waitFor(() => expect(h.confirm).toHaveBeenCalled());
    expect(a.publish).not.toHaveBeenCalled();
  });

  it('cannot publish with no standings, or while an action runs', () => {
    panel({ standings: [] });
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.finalizePublish') })).toBeDisabled();
  });

  it('cannot publish while busy', () => {
    panel({}, acts({ busy: true }));
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.finalizePublish') })).toBeDisabled();
  });

  it('shows the published result and, to staff only, a correction with a required reason', async () => {
    const { unmount } = render(<HostResultPanel challenge={{ ...base, result: { version: 1 }, viewer: { is_staff: false } } as never} actions={acts() as never} />);
    expect(screen.getByTestId('result-card')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: fallbackT('mweb.challenge.publishCorrection') })).not.toBeInTheDocument();
    unmount();
    const a = acts();
    render(<HostResultPanel challenge={{ ...base, result: { version: 1 }, viewer: { is_staff: true } } as never} actions={a as never} />);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.publishCorrection') }));
    fireEvent.click(await screen.findByRole('button', { name: fallbackT('mweb.challenge.publish') }));
    expect(await screen.findByText(fallbackT('mweb.challenge.errors.reason'))).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(new RegExp(fallbackT('mweb.challenge.fields.reason'))), { target: { value: 'Judge error' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.publish') }));
    await waitFor(() => expect(a.publish).toHaveBeenCalledWith('Judge error'));
    await waitFor(() => expect(screen.queryByText(fallbackT('mweb.challenge.correctionBody'))).not.toBeInTheDocument());
  });

  it('keeps the correction dialog open when it is refused, and cancels', async () => {
    const a = acts({ publish: vi.fn().mockResolvedValue(false) });
    render(<HostResultPanel challenge={{ ...base, result: { version: 1 }, viewer: { is_staff: true } } as never} actions={a as never} />);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.publishCorrection') }));
    fireEvent.change(await screen.findByLabelText(new RegExp(fallbackT('mweb.challenge.fields.reason'))), { target: { value: 'Judge error' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.publish') }));
    await waitFor(() => expect(a.publish).toHaveBeenCalled());
    expect(screen.getByText(fallbackT('mweb.challenge.correctionBody'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.cancel') }));
    await waitFor(() => expect(screen.queryByText(fallbackT('mweb.challenge.correctionBody'))).not.toBeInTheDocument());
  });
});

describe('HostRosterDialog', () => {
  const challenge = { participant_mode: 'INDIVIDUAL', competitors, players: [{ player_id: 'p1', name: 'Pat', team_id: 'c1', user_id: null }], judge_user_ids: ['u9'] };
  const queries = (seats: object[] | undefined, people: object[] | undefined) =>
    h.useQuery.mockImplementation((doc: { loc?: { source: { body: string } } }, opts: { skip?: boolean }) => {
      const body = doc.loc?.source.body ?? '';
      if (opts?.skip) return { data: undefined };
      return body.includes('podAttendeeSeats') ? { data: seats ? { podAttendeeSeats: seats } : undefined } : { data: people ? { publicUsersByIds: people } : undefined };
    });
  const dialog = (over: object = {}, a = acts(), open = true) => {
    const onClose = vi.fn();
    render(<HostRosterDialog open={open} podId="p1" challenge={{ ...challenge, ...over } as never} actions={a as never} onClose={onClose} />);
    return { a, onClose };
  };

  it('loads confirmed attendees only while open and lists them as link options', async () => {
    queries([{ user_id: 'u1' }], [{ user_id: 'u1', full_name: 'Asha Rao' }]);
    dialog();
    expect(screen.getByText(fallbackT('mweb.challenge.rosterTitle'))).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: fallbackT('mweb.challenge.fields.attendee') }));
    expect(await screen.findByRole('option', { name: 'Asha Rao' })).toBeInTheDocument();
    const skipFlags = h.useQuery.mock.calls.map((c) => c[1].skip);
    expect(skipFlags).toContain(false);
  });

  it('does not ask for people when there are no attendees, or when closed', () => {
    queries(undefined, undefined);
    dialog({}, acts(), false);
    expect(h.useQuery.mock.calls.every((c) => c[1].skip === true)).toBe(true);
  });

  it('copes with an open dialog that has seats loaded but no seat list', () => {
    queries([], undefined);
    dialog();
    expect(screen.getByText(fallbackT('mweb.challenge.rosterTitle'))).toBeInTheDocument();
  });

  it('saves the edited roster with ids nulled where blank and closes on success', async () => {
    queries([], []);
    const { a, onClose } = dialog();
    fireEvent.change(screen.getAllByLabelText(fallbackT('mweb.challenge.fields.name'))[0], { target: { value: '  Asha K  ' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.saveRoster') }));
    await waitFor(() => expect(a.roster).toHaveBeenCalledTimes(1));
    expect(a.roster).toHaveBeenCalledWith({
      competitors: [{ competitor_id: 'c1', name: 'Asha K', user_id: 'u1' }],
      players: [{ player_id: 'p1', name: 'Pat', team_id: 'c1', user_id: null }],
      judge_user_ids: ['u9'],
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('maps a new row (empty ids) to null ids, and keeps the dialog open when saving is refused', async () => {
    queries([], []);
    const { a, onClose } = dialog({ participant_mode: 'TEAM' }, acts({ roster: vi.fn().mockResolvedValue(false) }));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addCompetitor') }));
    fireEvent.change(screen.getAllByLabelText(fallbackT('mweb.challenge.fields.name'))[1], { target: { value: 'Blue team' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.saveRoster') }));
    await waitFor(() => expect(a.roster).toHaveBeenCalled());
    expect(a.roster.mock.calls[0][0].competitors[1]).toEqual({ competitor_id: expect.any(String), name: 'Blue team', user_id: null });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: fallbackT('mweb.challenge.players') })).toBeInTheDocument();
  });

  it('treats a competitor with no linked user as unlinked', async () => {
    queries([], []);
    const { a } = dialog({ competitors: [{ competitor_id: 'c1', name: 'Asha', user_id: null }] });
    fireEvent.change(screen.getAllByLabelText(fallbackT('mweb.challenge.fields.name'))[0], { target: { value: 'Asha K' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.saveRoster') }));
    await waitFor(() => expect(a.roster).toHaveBeenCalled());
    expect(a.roster.mock.calls[0][0].competitors[0].user_id).toBeNull();
  });

  it('closes from the cancel button', () => {
    queries([], []);
    const { onClose } = dialog();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.cancel') }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('CheckpointLinksDialog', () => {
  const dialog = (toolInstanceId: string | null, result: object) => {
    h.useQuery.mockReturnValue(result);
    const onClose = vi.fn();
    render(<CheckpointLinksDialog challengeId="ch1" toolInstanceId={toolInstanceId} onClose={onClose} />);
    return onClose;
  };
  const links = [{ item_key: 'a', label: 'Gate', url: 'https://duncit.test/c/a', qr_data_url: 'data:image/png;base64,AAAA' }];

  it('stays closed and does not query without a tool', () => {
    dialog(null, { data: undefined, loading: false, error: undefined });
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ skip: true, variables: { id: 'ch1', toolInstanceId: '' } });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a spinner while loading and an error when it fails', () => {
    dialog('t1', { data: undefined, loading: true, error: undefined });
    expect(screen.getByRole('progressbar', { name: fallbackT('mweb.challenge.loading') })).toBeInTheDocument();
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ skip: false, variables: { id: 'ch1', toolInstanceId: 't1' } });
  });

  it('shows the load error', () => {
    dialog('t1', { data: undefined, loading: false, error: { message: 'Hosts only' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Hosts only');
  });

  it('shows each checkpoint QR with its label, copies its link, and closes', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const onClose = dialog('t1', { data: { podChallengeCheckpointLinks: links }, loading: false, error: undefined });
    expect(screen.getByRole('img', { name: fallbackT('mweb.challenge.tools.qrAlt', { vars: { label: 'Gate' } }) })).toHaveAttribute('src', links[0].qr_data_url);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.copyLink') }));
    await waitFor(() => expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.challenge.linkCopied')));
    expect(writeText).toHaveBeenCalledWith('https://duncit.test/c/a');
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.common.close') }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tells the host when the link could not be copied', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true });
    dialog('t1', { data: { podChallengeCheckpointLinks: links }, loading: false, error: undefined });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.tools.copyLink') }));
    await waitFor(() => expect(h.error).toHaveBeenCalledWith(fallbackT('mweb.challenge.linkCopyFailed')));
    expect(h.warn).toHaveBeenCalledWith('host-pod-challenges', 'checkpoint-link', expect.any(Object));
  });
});

describe('HostChallengePanel', () => {
  const view = (over: object = {}) => ({
    id: 'ch1',
    pod_id: 'p1',
    name: 'Quiz night',
    status: 'LIVE',
    eligibility_warning: false,
    participant_mode: 'INDIVIDUAL',
    competitors,
    players: [],
    judge_user_ids: [],
    tools: [],
    ...over,
  });
  const panel = (challenge: object | null) => {
    h.live.mockReturnValue({ challenge, receivedAt: 0 });
    h.actions.mockReturnValue(acts());
    h.useQuery.mockReturnValue({ data: undefined, refetch: vi.fn().mockResolvedValue(undefined) });
    h.useMutation.mockReturnValue([vi.fn(), { loading: false }]);
    return render(<HostChallengePanel challengeId="ch1" />);
  };

  it('renders nothing until the challenge loads', () => {
    const { container } = panel(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the live controls, score pad and items while LIVE, plus score log and notifications', () => {
    panel(view());
    expect(screen.getByRole('region', { name: 'Quiz night' })).toBeInTheDocument();
    ['lifecycle', 'live-controls', 'quiz-control', 'run-controls', 'score-pad', 'items-control', 'toggles'].forEach((id) => expect(screen.getByTestId(id)).toBeInTheDocument());
    expect(screen.getAllByRole('heading', { name: fallbackT('mweb.challenge.scoreLog') }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { name: fallbackT('mweb.challenge.notifications') }).length).toBeGreaterThan(0);
    expect(screen.getByText(fallbackT('mweb.challenge.status.LIVE'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.rosterButton', { vars: { count: 1 } }) })).toBeEnabled();
  });

  it('hides the score pad and items when paused, but keeps live controls', () => {
    panel(view({ status: 'PAUSED' }));
    expect(screen.getByTestId('live-controls')).toBeInTheDocument();
    expect(screen.queryByTestId('score-pad')).not.toBeInTheDocument();
    expect(screen.queryByTestId('items-control')).not.toBeInTheDocument();
  });

  it('shows the result panel and no live controls once finished, with the roster locked', () => {
    panel(view({ status: 'COMPLETED', standings: [], result: null, viewer: { is_staff: false } }));
    expect(screen.queryByTestId('live-controls')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.rosterButton', { vars: { count: 1 } }) })).toBeDisabled();
    expect(screen.getByText(fallbackT('mweb.challenge.reviewBeforePublish'))).toBeInTheDocument();
  });

  it('shows only settings for a draft: no logs, no notifications, no live controls, no submissions', () => {
    panel(view({ status: 'DRAFT', tools: [{ input_kind: 'SUBMIT' }] }));
    expect(screen.queryByRole('heading', { name: fallbackT('mweb.challenge.scoreLog') })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: fallbackT('mweb.challenge.notifications') })).not.toBeInTheDocument();
    expect(screen.queryByTestId('tool-panels')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.rosterButton', { vars: { count: 1 } }) })).toBeEnabled();
  });

  it('locks the roster of a cancelled challenge and shows no submissions for it', () => {
    panel(view({ status: 'CANCELLED', tools: [{ input_kind: 'SUBMIT' }] }));
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.rosterButton', { vars: { count: 1 } }) })).toBeDisabled();
    expect(screen.queryByTestId('tool-panels')).not.toBeInTheDocument();
  });

  it('warns about eligibility, and shows the submissions gallery once scheduled', () => {
    panel(view({ status: 'SCHEDULED', eligibility_warning: true, tools: [{ input_kind: 'SUBMIT' }] }));
    expect(screen.getByText(fallbackT('mweb.challenge.eligibilityWarning'))).toBeInTheDocument();
    expect(screen.getByTestId('tool-panels')).toHaveAttribute('data-only', 'SUBMIT');
  });

  it('opens the roster dialog and falls back to the raw status for one with no label', async () => {
    panel(view({ status: 'MYSTERY' }));
    expect(screen.getByText('MYSTERY')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.rosterButton', { vars: { count: 1 } }) }));
    expect(await screen.findByText(fallbackT('mweb.challenge.rosterTitle'))).toBeInTheDocument();
  });
});

describe('HostPodChallengesPage', () => {
  const page = (setup: object, list: object, create = vi.fn().mockResolvedValue({})) => {
    h.useQuery.mockImplementation((doc: { loc?: { source: { body: string } } }) => ((doc.loc?.source.body ?? '').includes('podChallengeSetup') ? setup : list));
    h.useMutation.mockReturnValue([create, { loading: false }]);
    h.live.mockReturnValue({ challenge: null, receivedAt: 0 });
    h.actions.mockReturnValue(acts());
    render(
      <MemoryRouter initialEntries={['/host/pod/p1/challenges']}>
        <Routes>
          <Route path="/host/pod/:podId/challenges" element={<HostPodChallengesPage />} />
        </Routes>
      </MemoryRouter>
    );
    return create;
  };
  const config = (over: object = {}) => ({ data: { podChallengeSetup: { enabled: true, require_challenge: false, default_template_id: 't1', templates: [{ id: 't1', name: 'Quiz' }], ...over } }, loading: false, error: undefined });

  it('shows a spinner while loading with nothing yet', () => {
    page({ data: undefined, loading: true }, { data: undefined, loading: true });
    expect(screen.getByRole('progressbar', { name: fallbackT('mweb.challenge.loading') })).toBeInTheDocument();
  });

  it('shows the setup error', () => {
    page({ data: undefined, loading: false, error: { message: 'No access' } }, { data: undefined, loading: false });
    expect(screen.getByText('No access')).toBeInTheDocument();
  });

  it('says challenges are not enabled for the category, or have no templates', () => {
    page(config({ enabled: false }), { data: { podChallenges: [] }, loading: false });
    expect(screen.getByText(fallbackT('mweb.challenge.notEnabled'))).toBeInTheDocument();
  });

  it('says there are no templates when the category offers none', () => {
    page(config({ templates: [] }), { data: { podChallenges: [] }, loading: false });
    expect(screen.getByText(fallbackT('mweb.challenge.noTemplates'))).toBeInTheDocument();
  });

  it('creates a challenge from the form with a trimmed or null name, confirming it', async () => {
    const create = page(config(), { data: { podChallenges: [] }, loading: false });
    expect(screen.getByText(fallbackT('mweb.challenge.noChallengesYet'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addChallenge') }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ variables: { input: { pod_id: 'p1', template_id: 't1', name: null } } }));
    expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.challenge.created'));
  });

  it('sends a typed name', async () => {
    const create = page(config(), { data: { podChallenges: [] }, loading: false });
    fireEvent.change(screen.getByLabelText(fallbackT('mweb.challenge.fields.challengeName')), { target: { value: '  Finale ' } });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addChallenge') }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ variables: { input: { pod_id: 'p1', template_id: 't1', name: 'Finale' } } }));
  });

  it('shows the server reason when creating is refused', async () => {
    page(config(), { data: { podChallenges: [] }, loading: false }, vi.fn().mockRejectedValue(new Error('Not allowed for this pod')));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addChallenge') }));
    await waitFor(() => expect(h.error).toHaveBeenCalledWith('Not allowed for this pod'));
    expect(h.success).not.toHaveBeenCalled();
  });

  it('creates with no default template when the category sets none', async () => {
    const create = page(config({ default_template_id: undefined }), { data: { podChallenges: [] }, loading: false });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.addChallenge') }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ variables: { input: { pod_id: 'p1', template_id: 't1', name: null } } }));
  });

  it('warns that a challenge is required when the category demands one and there is none', () => {
    page(config({ require_challenge: true }), { data: { podChallenges: [] }, loading: false });
    expect(screen.getByText(fallbackT('mweb.challenge.required'))).toBeInTheDocument();
  });

  it('lists a panel per challenge and hides the empty note and the required warning', () => {
    h.live.mockReturnValue({ challenge: null, receivedAt: 0 });
    page(config({ require_challenge: true }), { data: { podChallenges: [{ id: 'a' }, { id: 'b' }] }, loading: false });
    expect(screen.queryByText(fallbackT('mweb.challenge.required'))).not.toBeInTheDocument();
    expect(screen.queryByText(fallbackT('mweb.challenge.noChallengesYet'))).not.toBeInTheDocument();
    expect(h.live).toHaveBeenCalledTimes(2);
  });

  it('keeps the empty note back while the list is still loading', () => {
    page(config(), { data: undefined, loading: true });
    expect(screen.queryByText(fallbackT('mweb.challenge.noChallengesYet'))).not.toBeInTheDocument();
  });

  it('skips both queries without a pod id', () => {
    h.useQuery.mockReturnValue({ data: undefined, loading: false, error: undefined });
    h.useMutation.mockReturnValue([vi.fn(), { loading: false }]);
    render(
      <MemoryRouter initialEntries={['/host/challenges']}>
        <Routes>
          <Route path="/host/challenges" element={<HostPodChallengesPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(h.useQuery.mock.calls.every((c) => c[1].skip === true)).toBe(true);
    void act;
  });
});
