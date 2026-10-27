import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useSearchParams } from 'react-router';

import LeaderAnnouncer from '../LeaderAnnouncer';
import ArenaLive from '../ArenaLive';
import PodChallengeArenaPage from '../index';
import { useCheckpointScan } from '../useCheckpointScan';
import { useFullscreen } from '../useFullscreen';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  live: vi.fn(),
  scan: vi.fn(),
  actions: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('../../../components/pod-challenge/usePodChallengeLive', () => ({ usePodChallengeLive: h.live }));
vi.mock('../../../components/pod-challenge/useChallengeToolActions', () => ({ useChallengeToolActions: h.actions }));
vi.mock('../../../components/notify', () => ({ notifyError: h.error, notifySuccess: vi.fn() }));
vi.mock('@duncit/logs', async (orig) => {
  const real = await orig<typeof import('@duncit/logs')>();
  return { ...real, logs: { ...real.logs, mWeb: { ...real.logs.mWeb, warn: h.warn } } };
});
vi.mock('../../../components/pod-challenge/ChallengeResultCard', () => ({ default: (p: { showViewLink: boolean }) => <div data-testid="result" data-link={String(p.showViewLink)} /> }));
vi.mock('../../../components/pod-challenge/ChallengeToolPanels', () => ({
  default: (p: { interactive: boolean; only?: string[] }) => <div data-testid="tool-panels" data-interactive={String(p.interactive)} data-only={(p.only ?? []).join(',')} />,
}));
vi.mock('../../../components/pod-challenge/ChallengeBallotPanel', () => ({ default: (p: { tool: { instance_id: string } }) => <div data-testid={`ballot-${p.tool.instance_id}`} /> }));
vi.mock('../../../components/pod-challenge/ChallengeJudgePanel', () => ({ default: (p: { tool: { instance_id: string } }) => <div data-testid={`judge-${p.tool.instance_id}`} /> }));
vi.mock('../../../components/pod-challenge/ChallengeClock', () => ({ default: (p: { tool: { instance_id: string }; large?: boolean }) => <div data-testid={`clock-${p.tool.instance_id}`} data-large={String(Boolean(p.large))} /> }));
vi.mock('../../pod-pending-page/PageBackHeader', () => ({ default: (p: { title: string }) => <h1>{p.title}</h1> }));

const standings = [
  { competitor_id: 'c1', name: 'Asha', rank: 1, total: 9 },
  { competitor_id: 'c2', name: 'Bela', rank: 2, total: 5 },
];

const view = (over: object = {}) => ({
  id: 'ch1',
  pod_id: 'p1',
  pod_title: 'Sunday pod',
  name: 'Quiz night',
  status: 'LIVE',
  current_round: 2,
  tools: [] as object[],
  standings,
  result: null,
  viewer: { can_interact: false, can_judge: false, my_competitor_id: null },
  ...over,
});

describe('LeaderAnnouncer', () => {
  it('stays silent on first render, announces only when the lead changes, and not when it clears', () => {
    const { rerender } = render(<LeaderAnnouncer leaders={['Asha']} />);
    expect(screen.getByRole('status')).toHaveTextContent('');
    rerender(<LeaderAnnouncer leaders={['Bela', 'Chitra']} large />);
    expect(screen.getByRole('status')).toHaveTextContent(fallbackT('mweb.challenge.nowLeading', { vars: { names: 'Bela, Chitra' } }));
    rerender(<LeaderAnnouncer leaders={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent(fallbackT('mweb.challenge.nowLeading', { vars: { names: 'Bela, Chitra' } }));
  });

  it('does not repeat when the same leader is passed again', () => {
    const { rerender } = render(<LeaderAnnouncer leaders={['Asha']} />);
    rerender(<LeaderAnnouncer leaders={['Asha']} />);
    expect(screen.getByRole('status')).toHaveTextContent('');
  });
});

describe('useFullscreen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
  });

  it('reports support from the browser, and follows fullscreenchange for its own element only', () => {
    const el = document.createElement('div');
    const ref = { current: el };
    document.documentElement.requestFullscreen = vi.fn();
    const { result } = renderHook(() => useFullscreen(ref));
    expect(result.current.supported).toBe(true);
    expect(result.current.active).toBe(false);
    Object.defineProperty(document, 'fullscreenElement', { value: el, configurable: true });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current.active).toBe(true);
    Object.defineProperty(document, 'fullscreenElement', { value: document.body, configurable: true });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current.active).toBe(false);
  });

  it('is not active when there is no element at all', () => {
    const { result } = renderHook(() => useFullscreen(createRef<HTMLElement>()));
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current.active).toBe(false);
  });

  it('reports no support when the browser has no fullscreen API', () => {
    const original = document.documentElement.requestFullscreen;
    // @ts-expect-error simulating a browser without the API
    document.documentElement.requestFullscreen = undefined;
    const { result } = renderHook(() => useFullscreen(createRef<HTMLElement>()));
    expect(result.current.supported).toBe(false);
    document.documentElement.requestFullscreen = original;
  });

  it('enters fullscreen on its element, and exits when already fullscreen', async () => {
    const el = document.createElement('div');
    const request = vi.fn().mockResolvedValue(undefined);
    el.requestFullscreen = request;
    const { result } = renderHook(() => useFullscreen({ current: el }));
    await act(async () => result.current.toggle());
    expect(request).toHaveBeenCalledTimes(1);
    const exit = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = exit;
    Object.defineProperty(document, 'fullscreenElement', { value: el, configurable: true });
    await act(async () => result.current.toggle());
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is no element to enter fullscreen with', async () => {
    const { result } = renderHook(() => useFullscreen(createRef<HTMLElement>()));
    await act(async () => result.current.toggle());
    expect(h.warn).not.toHaveBeenCalled();
  });

  it('logs a refusal instead of throwing', async () => {
    const el = document.createElement('div');
    el.requestFullscreen = vi.fn().mockRejectedValue(new Error('not allowed'));
    const { result } = renderHook(() => useFullscreen({ current: el }));
    await act(async () => result.current.toggle());
    expect(h.warn).toHaveBeenCalledWith('pod-challenge-arena', 'fullscreen', expect.any(Object));
  });
});

describe('useCheckpointScan', () => {
  const Probe = ({ challenge }: { challenge: object | null }) => {
    const waiting = useCheckpointScan(challenge as never);
    const [params] = useSearchParams();
    return <div data-testid="probe" data-waiting={String(waiting)} data-checkpoint={params.get('checkpoint') ?? ''} />;
  };
  const mount = (url: string, challenge: object | null) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="*" element={<Probe challenge={challenge} />} />
        </Routes>
      </MemoryRouter>
    );
  const checkpoint = vi.fn();

  beforeEach(() => {
    checkpoint.mockReset().mockResolvedValue(true);
    h.actions.mockReturnValue({ checkpoint });
  });

  it('sends the scanned code once for a competitor, then drops the parameter', async () => {
    mount('/arena?checkpoint=tool1.CODE9&tv=1', view({ viewer: { my_competitor_id: 'c1' } }));
    await waitFor(() => expect(checkpoint).toHaveBeenCalledWith('tool1', 'CODE9'));
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveAttribute('data-checkpoint', ''));
    expect(checkpoint).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('probe')).toHaveAttribute('data-waiting', 'false');
  });

  it('keeps a scan waiting, and says so, until the viewer is a competitor', () => {
    mount('/arena?checkpoint=tool1.CODE9', view({ viewer: { my_competitor_id: null } }));
    expect(screen.getByTestId('probe')).toHaveAttribute('data-waiting', 'true');
    expect(screen.getByTestId('probe')).toHaveAttribute('data-checkpoint', 'tool1.CODE9');
    expect(checkpoint).not.toHaveBeenCalled();
  });

  it('waits for the challenge to load before doing anything', () => {
    mount('/arena?checkpoint=tool1.CODE9', null);
    expect(checkpoint).not.toHaveBeenCalled();
    expect(screen.getByTestId('probe')).toHaveAttribute('data-waiting', 'false');
  });

  it('reports a malformed code once and drops it', async () => {
    mount('/arena?checkpoint=garbage', view({ viewer: { my_competitor_id: 'c1' } }));
    await waitFor(() => expect(h.error).toHaveBeenCalledWith(fallbackT('mweb.challenge.tools.checkpointInvalid')));
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveAttribute('data-checkpoint', ''));
    expect(h.error).toHaveBeenCalledTimes(1);
    expect(checkpoint).not.toHaveBeenCalled();
  });

  it('does nothing without a checkpoint parameter', () => {
    mount('/arena', view({ viewer: { my_competitor_id: 'c1' } }));
    expect(checkpoint).not.toHaveBeenCalled();
    expect(screen.getByTestId('probe')).toHaveAttribute('data-waiting', 'false');
  });
});

describe('ArenaLive', () => {
  const live = (challenge: object, tv = false) => render(<ArenaLive challenge={challenge as never} receivedAt={0} tv={tv} />);
  const tool = (id: string, kind: string, config = '{}') => ({ instance_id: id, input_kind: kind, label: id, config_json: config });

  it('shows the status, the leaderboard and the tool panels', () => {
    live(view());
    expect(screen.getByText(fallbackT('mweb.challenge.status.LIVE'))).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: fallbackT('mweb.challenge.leaderboard') })).toBeInTheDocument();
    expect(screen.getByTestId('tool-panels')).toHaveAttribute('data-interactive', 'true');
    expect(screen.queryByText(new RegExp(fallbackT('mweb.challenge.roundOf', { vars: { round: 2, total: 3 } })))).not.toBeInTheDocument();
  });

  it('shows the round, a clock per timer, ballots for an interactive attendee and the sheet for a judge', () => {
    live(
      view({
        tools: [tool('r', 'ROUND', '{"rounds":3}'), tool('clk', 'CLOCK'), tool('v', 'VOTE'), tool('j', 'JUDGE')],
        viewer: { can_interact: true, can_judge: true },
      })
    );
    expect(screen.getByText(fallbackT('mweb.challenge.roundOf', { vars: { round: 2, total: 3 } }))).toBeInTheDocument();
    expect(screen.getByTestId('clock-clk')).toHaveAttribute('data-large', 'false');
    expect(screen.getByTestId('ballot-v')).toBeInTheDocument();
    expect(screen.getByTestId('judge-j')).toBeInTheDocument();
  });

  it('shows a single round when the tool does not say how many', () => {
    live(view({ tools: [tool('r', 'ROUND')] }));
    expect(screen.getByText(fallbackT('mweb.challenge.roundOf', { vars: { round: 2, total: 1 } }))).toBeInTheDocument();
  });

  it('gives a viewer who cannot vote or judge no ballots or sheets', () => {
    live(view({ tools: [tool('v', 'VOTE'), tool('j', 'JUDGE')] }));
    expect(screen.queryByTestId('ballot-v')).not.toBeInTheDocument();
    expect(screen.queryByTestId('judge-j')).not.toBeInTheDocument();
  });

  it('is read-only in TV mode: large clocks, no ballots, no sheets, non-interactive panels', () => {
    live(view({ tools: [tool('clk', 'CLOCK'), tool('v', 'VOTE'), tool('j', 'JUDGE')], viewer: { can_interact: true, can_judge: true } }), true);
    expect(screen.getByTestId('clock-clk')).toHaveAttribute('data-large', 'true');
    expect(screen.queryByTestId('ballot-v')).not.toBeInTheDocument();
    expect(screen.queryByTestId('judge-j')).not.toBeInTheDocument();
    expect(screen.getByTestId('tool-panels')).toHaveAttribute('data-interactive', 'false');
  });

  it('uses the plain colour and the raw status for a paused or unlabelled one', () => {
    const { unmount } = live(view({ status: 'PAUSED' }));
    expect(screen.getByText(fallbackT('mweb.challenge.status.PAUSED'))).toBeInTheDocument();
    unmount();
    live(view({ status: 'WEIRD' }));
    expect(screen.getByText('WEIRD')).toBeInTheDocument();
  });
});

describe('PodChallengeArenaPage', () => {
  const Where = () => {
    const location = useLocation();
    return <div data-testid="where">{location.pathname + location.search}</div>;
  };
  const page = (url: string, state: object) => {
    h.live.mockReturnValue({ receivedAt: 0, loading: false, error: undefined, challenge: view(), ...state });
    h.actions.mockReturnValue({ checkpoint: vi.fn() });
    return render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/pod/:podId/challenges/:challengeId/live"
            element={
              <>
                <PodChallengeArenaPage />
                <Where />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };
  const URL = '/pod/p1/challenges/ch1/live';
  const finishedResult = { winner_ids: ['c1'], standings, version: 1, published_at: 'x', reason: '' };

  beforeEach(() => {
    h.actions.mockReturnValue({ checkpoint: vi.fn() });
    document.documentElement.requestFullscreen = vi.fn();
  });

  it('shows a spinner while the challenge loads', () => {
    page(URL, { loading: true, challenge: null });
    expect(screen.getByRole('progressbar', { name: fallbackT('mweb.challenge.loading') })).toBeInTheDocument();
  });

  it('shows an error alert, or a not-available note, instead of the arena', () => {
    const { unmount } = page(URL, { challenge: null, error: new Error('x') });
    expect(screen.getByText(fallbackT('mweb.challenge.loadError'))).toBeInTheDocument();
    unmount();
    page(URL, { challenge: null });
    expect(screen.getByText(fallbackT('mweb.challenge.notAvailable'))).toBeInTheDocument();
  });

  it('shows the live arena with its title, pod, and toggles TV mode through the URL', () => {
    page(URL, {});
    expect(screen.getByRole('heading', { name: 'Quiz night' })).toBeInTheDocument();
    expect(screen.getByText('Sunday pod')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent(URL);
    const tvButton = screen.getByRole('button', { name: fallbackT('mweb.challenge.tvMode') });
    expect(tvButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(tvButton);
    expect(screen.getByTestId('where')).toHaveTextContent(`${URL}?tv=1`);
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.challenge.exitTv') }));
    expect(screen.getByTestId('where')).toHaveTextContent(URL);
    expect(screen.getByTestId('where').textContent).not.toContain('tv=1');
  });

  it('starts in TV mode from the query string', () => {
    page(`${URL}?tv=1`, {});
    expect(screen.getByRole('button', { name: fallbackT('mweb.challenge.exitTv') })).toHaveAttribute('aria-pressed', 'true');
  });

  it('warns that a checkpoint scan is waiting for the viewer to become a competitor', () => {
    page(`${URL}?checkpoint=t1.CODE`, {});
    expect(screen.getByText(fallbackT('mweb.challenge.tools.checkpointNeedCompetitor'))).toBeInTheDocument();
  });

  it('offers fullscreen when the browser supports it, and toggles it', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    page(URL, {});
    const button = screen.getByRole('button', { name: fallbackT('mweb.challenge.fullscreen') });
    const arena = button.closest('div[class*="MuiBox-root"]') as HTMLElement;
    arena.requestFullscreen = request;
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { value: request, configurable: true });
    fireEvent.click(button);
    await waitFor(() => expect(request).toHaveBeenCalled());
  });

  it('shows the exit-fullscreen control while the arena is fullscreen', async () => {
    page(URL, {});
    const button = screen.getByRole('button', { name: fallbackT('mweb.challenge.fullscreen') });
    const arena = button.closest('div[class*="MuiBox-root"]') as HTMLElement;
    Object.defineProperty(document, 'fullscreenElement', { value: arena, configurable: true });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(await screen.findByRole('button', { name: fallbackT('mweb.challenge.exitFullscreen') })).toBeInTheDocument();
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(await screen.findByRole('button', { name: fallbackT('mweb.challenge.fullscreen') })).toBeInTheDocument();
  });

  it('hides the fullscreen button when unsupported', () => {
    // @ts-expect-error simulating a browser without the API
    document.documentElement.requestFullscreen = undefined;
    page(URL, {});
    expect(screen.queryByRole('button', { name: fallbackT('mweb.challenge.fullscreen') })).not.toBeInTheDocument();
  });

  it('announces the winners, shows the final result and the submissions gallery once finished', () => {
    page(URL, { challenge: view({ status: 'COMPLETED', result: finishedResult }) });
    expect(screen.getByRole('heading', { name: fallbackT('mweb.challenge.winnerAnnouncement', { vars: { names: 'Asha' } }) })).toBeInTheDocument();
    expect(screen.getByTestId('result')).toHaveAttribute('data-link', 'false');
    expect(screen.getByTestId('tool-panels')).toHaveAttribute('data-only', 'SUBMIT');
    expect(screen.getByTestId('tool-panels')).toHaveAttribute('data-interactive', 'true');
    expect(screen.queryByText(fallbackT('mweb.challenge.leaderboard'))).not.toBeInTheDocument();
  });

  it('announces the winners in the large projector layout in TV mode', () => {
    page(`${URL}?tv=1`, { challenge: view({ status: 'COMPLETED', result: finishedResult }) });
    expect(screen.getByRole('heading', { name: fallbackT('mweb.challenge.winnerAnnouncement', { vars: { names: 'Asha' } }) })).toBeInTheDocument();
  });

  it('says results are pending when finished without a published result, and keeps the gallery read-only in TV mode', () => {
    page(`${URL}?tv=1`, { challenge: view({ status: 'COMPLETED', result: null }) });
    expect(screen.getByText(fallbackT('mweb.challenge.resultsPending'))).toBeInTheDocument();
    expect(screen.queryByTestId('result')).not.toBeInTheDocument();
    expect(screen.getByTestId('tool-panels')).toHaveAttribute('data-interactive', 'false');
  });
});
