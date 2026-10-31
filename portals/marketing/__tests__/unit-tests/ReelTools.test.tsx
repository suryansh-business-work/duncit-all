import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { GENERATE_REEL_VARIANTS, RECOMMEND_NEXT_REEL, REEL_ANALYTICS, VALIDATE_REEL } from '../../src/pages/reels/queries';
import AnalyticsDrawer from '../../src/pages/reels/studio/tools/AnalyticsDrawer';
import HistoryDrawer from '../../src/pages/reels/studio/tools/HistoryDrawer';
import PlatformPicker from '../../src/pages/reels/studio/tools/PlatformPicker';
import StudioDialogs from '../../src/pages/reels/studio/tools/StudioDialogs';
import { useReelAnalytics } from '../../src/pages/reels/studio/tools/useReelAnalytics';
import { useStudioTools, type StudioTools } from '../../src/pages/reels/studio/tools/useStudioTools';
import { checkTally, sameSet, useValidation } from '../../src/pages/reels/studio/tools/useValidation';
import { useVariants } from '../../src/pages/reels/studio/tools/useVariants';
import ValidateDialog from '../../src/pages/reels/studio/tools/ValidateDialog';
import VariantsDialog from '../../src/pages/reels/studio/tools/VariantsDialog';
import type { ReelActions } from '../../src/pages/reels/studio/useReelActions';
import type { SocialPlatform } from '../../src/pages/social-accounts-page/queries';
import { renderWithProviders } from '../testkit';
import {
  answerQuery,
  mutationOf,
  queryOptions,
  reelAnalytics,
  reelAnalyticsPost,
  reelCheck,
  reelMessage,
  reelProject,
  reelRecommendation,
  reelVariant,
  resetApollo,
} from '../mocks/reel-apollo-mock';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../mocks/reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

const PROJECT_ID = 'DUN-REEL-1';
const failure = new Error('The server refused.');

const tick = (platform: SocialPlatform) => fireEvent.click(within(screen.getByTestId(`reel-platform-${platform}`)).getByRole('checkbox'));

const actions = (): ReelActions =>
  ({ restoreVersion: vi.fn(async () => undefined) }) as unknown as ReelActions;

beforeEach(() => {
  resetApollo();
  vi.mocked(notifyError).mockClear();
  vi.mocked(notifySuccess).mockClear();
});

describe('PlatformPicker', () => {
  it('adds and removes networks as they are ticked', () => {
    const onChange = vi.fn();
    const { rerender } = renderWithProviders(<PlatformPicker label="Networks" value={[]} onChange={onChange} />);
    tick('INSTAGRAM');
    expect(onChange).toHaveBeenLastCalledWith(['INSTAGRAM']);
    rerender(<PlatformPicker label="Networks" value={['INSTAGRAM', 'X']} onChange={onChange} />);
    tick('INSTAGRAM');
    expect(onChange).toHaveBeenLastCalledWith(['X']);
  });
});

describe('useValidation', () => {
  it('asks the server for the networks picked, and asks again rather than answering from memory', () => {
    const refetch = answerQuery(VALIDATE_REEL, { data: { validateReel: [reelCheck()] } });
    const { result } = renderHook(() => useValidation(PROJECT_ID));
    act(() => result.current.run());
    expect(queryOptions.get(VALIDATE_REEL)?.skip).toBe(true);

    act(() => result.current.setPlatforms(['X', 'INSTAGRAM']));
    act(() => result.current.run());
    expect(queryOptions.get(VALIDATE_REEL)?.variables).toEqual({ project_id: PROJECT_ID, platforms: ['X', 'INSTAGRAM'] });
    expect(result.current.checks).toEqual([reelCheck()]);

    act(() => result.current.setPlatforms(['INSTAGRAM', 'X']));
    act(() => result.current.run());
    expect(refetch).toHaveBeenCalledTimes(1);

    act(() => result.current.setPlatforms(['X']));
    act(() => result.current.run());
    expect(queryOptions.get(VALIDATE_REEL)?.variables).toEqual({ project_id: PROJECT_ID, platforms: ['X'] });
  });

  it('compares network sets regardless of order, and tallies the checks', () => {
    expect(sameSet(['X', 'INSTAGRAM'], ['INSTAGRAM', 'X'])).toBe(true);
    expect(sameSet(['X'], ['INSTAGRAM'])).toBe(false);
    expect(sameSet(['X'], ['X', 'INSTAGRAM'])).toBe(false);
    expect(checkTally([reelCheck(), reelCheck({ name: 'sound', pass: false })])).toEqual({ passed: 1, total: 2 });
  });
});

describe('ValidateDialog', () => {
  it('shows the last checks until a fresh run replaces them, and hands the result up', async () => {
    const onResult = vi.fn();
    answerQuery(VALIDATE_REEL, { data: { validateReel: [reelCheck(), reelCheck({ name: 'sound', pass: false, detail: 'No sound on X' })] } });
    renderWithProviders(<ValidateDialog open onClose={vi.fn()} projectId={PROJECT_ID} lastChecks={[reelCheck({ name: 'frame' })]} onResult={onResult} />);
    expect(screen.getByTestId('reel-check-frame')).toBeInTheDocument();
    expect(screen.getByTestId('reel-validate-run')).toBeDisabled();
    expect(onResult).not.toHaveBeenCalled();

    tick('X');
    fireEvent.click(screen.getByTestId('reel-validate-run'));
    expect(await screen.findByTestId('reel-check-sound')).toHaveTextContent('No sound on X');
    expect(screen.getByTestId('reel-check-sound')).toHaveAttribute('data-pass', 'false');
    expect(within(screen.getByTestId('reel-check-sound')).getByRole('img')).toHaveAccessibleName('Fails');
    expect(within(screen.getByTestId('reel-check-length')).getByRole('img')).toHaveAccessibleName('Passes');
    expect(screen.getByTestId('reel-validate-summary')).toHaveTextContent('1 of 2 checks pass');
    expect(screen.queryByTestId('reel-check-frame')).not.toBeInTheDocument();
    expect(onResult).toHaveBeenCalledWith([reelCheck(), reelCheck({ name: 'sound', pass: false, detail: 'No sound on X' })]);
  });

  it('says why the checks could not run, and what to do before any have', () => {
    answerQuery(VALIDATE_REEL, { error: new Error('Reel has no scenes') });
    const onClose = vi.fn();
    renderWithProviders(<ValidateDialog open onClose={onClose} projectId={PROJECT_ID} lastChecks={[]} onResult={vi.fn()} />);
    expect(screen.getByTestId('reel-validate-empty')).toBeInTheDocument();
    tick('INSTAGRAM');
    fireEvent.click(screen.getByTestId('reel-validate-run'));
    expect(screen.getByTestId('reel-validate-error')).toHaveTextContent('Reel has no scenes');
    fireEvent.click(screen.getByTestId('reel-validate-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('useVariants', () => {
  it('has the captions written and says so, or says why not', async () => {
    const { result } = renderHook(() => useVariants(PROJECT_ID));
    let done = false;
    await act(async () => {
      done = await result.current.generate(['INSTAGRAM']);
    });
    expect(done).toBe(true);
    expect(mutationOf(GENERATE_REEL_VARIANTS)).toHaveBeenCalledWith({ variables: { project_id: PROJECT_ID, platforms: ['INSTAGRAM'] } });
    expect(notifySuccess).toHaveBeenCalledTimes(1);

    mutationOf(GENERATE_REEL_VARIANTS).mockRejectedValue(failure);
    await act(async () => {
      done = await result.current.generate(['X']);
    });
    expect(done).toBe(false);
    expect(notifyError).toHaveBeenCalledWith('The server refused.');
  });
});

describe('VariantsDialog', () => {
  it('starts on the networks that already have captions, writes more, and hands one to the post', async () => {
    const onUse = vi.fn();
    const onClose = vi.fn();
    renderWithProviders(<VariantsDialog open onClose={onClose} project={reelProject({ variants: [reelVariant()] })} onUse={onUse} />);
    expect(within(screen.getByTestId('reel-platform-INSTAGRAM')).getByRole('checkbox')).toBeChecked();
    expect(screen.getByTestId('reel-variants-generate')).toHaveTextContent('Write again');
    tick('YOUTUBE');
    fireEvent.click(screen.getByTestId('reel-variants-generate'));
    await waitFor(() => expect(mutationOf(GENERATE_REEL_VARIANTS)).toHaveBeenCalledWith({ variables: { project_id: PROJECT_ID, platforms: ['INSTAGRAM', 'YOUTUBE'] } }));

    fireEvent.click(screen.getByTestId('reel-variant-use-INSTAGRAM'));
    await waitFor(() => expect(onUse).toHaveBeenCalledWith(reelVariant()));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('explains what to do before any caption exists', () => {
    renderWithProviders(<VariantsDialog open onClose={vi.fn()} project={reelProject()} onUse={vi.fn()} />);
    expect(screen.getByTestId('reel-variants-empty')).toBeInTheDocument();
    expect(screen.getByTestId('reel-variants-generate')).toBeDisabled();
    expect(screen.getByTestId('reel-variants-generate')).toHaveTextContent('Write captions');
  });
});

describe('HistoryDrawer', () => {
  it('lists every restorable version newest first, and puts one back', async () => {
    const onRestore = vi.fn(async () => undefined);
    renderWithProviders(
      <HistoryDrawer
        open
        onClose={vi.fn()}
        messages={[reelMessage(), reelMessage({ id: 'm2', role: 'ASSISTANT', text: 'Opened on the drums.', restorable: true, at: '2026-10-01T12:05:00.000Z' }), reelMessage({ id: 'm3', role: 'ASSISTANT', text: 'Added a title.', restorable: true, at: '2026-10-01T12:09:00.000Z' })]}
        onRestore={onRestore}
      />
    );
    const rows = screen.getAllByTestId(/^reel-history-m/);
    expect(rows.map((row) => row.dataset.testid)).toEqual(['reel-history-m3', 'reel-history-m2']);
    expect(rows[0]).toHaveTextContent('Latest');
    expect(rows[1]).not.toHaveTextContent('Latest');
    fireEvent.click(screen.getByTestId('reel-history-restore-m2'));
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith('m2'));
  });

  it('says so before the editor has made a version, and closes', () => {
    const onClose = vi.fn();
    renderWithProviders(<HistoryDrawer open onClose={onClose} messages={[reelMessage()]} onRestore={vi.fn()} />);
    expect(screen.getByTestId('reel-history-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-history-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('useReelAnalytics', () => {
  it('reads the numbers only once the drawer is open, and asks for a recommendation on demand', async () => {
    answerQuery(REEL_ANALYTICS, { data: { reelAnalytics: reelAnalytics() } });
    mutationOf(RECOMMEND_NEXT_REEL).mockResolvedValue({ data: { recommendNextReel: { run_id: 'run-5', recommendations: [reelRecommendation()] } } });
    const { result, rerender } = renderHook(({ open }) => useReelAnalytics(PROJECT_ID, open), { initialProps: { open: false } });
    expect(queryOptions.get(REEL_ANALYTICS)?.skip).toBe(true);
    expect(result.current.analytics).toBeNull();
    rerender({ open: true });
    expect(result.current.analytics?.views).toBe(1200);

    expect(result.current.recommendations).toBeNull();
    await act(() => result.current.recommend());
    expect(result.current.recommendations).toEqual([reelRecommendation()]);

    mutationOf(RECOMMEND_NEXT_REEL).mockResolvedValue({ data: undefined });
    await act(() => result.current.recommend());
    expect(result.current.recommendations).toEqual([]);

    mutationOf(RECOMMEND_NEXT_REEL).mockRejectedValue(failure);
    await act(() => result.current.recommend());
    expect(notifyError).toHaveBeenCalledWith('The server refused.');
  });
});

describe('AnalyticsDrawer', () => {
  it('shows the totals, each post with its link, and what to make next', async () => {
    answerQuery(REEL_ANALYTICS, { data: { reelAnalytics: reelAnalytics({ posts: [reelAnalyticsPost(), reelAnalyticsPost({ platform: 'X', permalink: '', published_at: null, views: 3 })] }) } });
    mutationOf(RECOMMEND_NEXT_REEL).mockResolvedValue({ data: { recommendNextReel: { run_id: 'run-5', recommendations: [reelRecommendation()] } } });
    renderWithProviders(<AnalyticsDrawer open onClose={vi.fn()} projectId={PROJECT_ID} />);
    expect(screen.getByTestId('reel-analytics-views')).toHaveTextContent('1,200');
    expect(screen.getByTestId('reel-analytics-engagement')).toHaveTextContent('97');
    expect(within(screen.getByTestId('reel-analytics-post-INSTAGRAM')).getByRole('link')).toHaveAttribute('href', 'https://www.instagram.com/reel/abc');
    // A post with no link, and no date yet.
    expect(within(screen.getByTestId('reel-analytics-post-X')).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByTestId('reel-analytics-post-X')).toHaveTextContent('— · 3 views');

    fireEvent.click(screen.getByTestId('reel-analytics-recommend'));
    expect(await screen.findByTestId('reel-analytics-recommendations')).toHaveTextContent('Behind the scenes');
  });

  it('waits for the numbers, says when they could not be read, and says when there is nothing to show', async () => {
    answerQuery(REEL_ANALYTICS, { loading: true });
    const { unmount } = renderWithProviders(<AnalyticsDrawer open onClose={vi.fn()} projectId={PROJECT_ID} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    unmount();

    answerQuery(REEL_ANALYTICS, { error: new Error('Analytics is not connected') });
    const second = renderWithProviders(<AnalyticsDrawer open onClose={vi.fn()} projectId={PROJECT_ID} />);
    expect(screen.getByTestId('reel-analytics-error')).toHaveTextContent('Analytics is not connected');
    second.unmount();

    answerQuery(REEL_ANALYTICS, { data: { reelAnalytics: reelAnalytics({ posts: [] }) } });
    mutationOf(RECOMMEND_NEXT_REEL).mockResolvedValue({ data: { recommendNextReel: { run_id: 'run-5', recommendations: [] } } });
    const onClose = vi.fn();
    renderWithProviders(<AnalyticsDrawer open onClose={onClose} projectId={PROJECT_ID} />);
    expect(screen.getByTestId('reel-analytics-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-analytics-recommend'));
    expect(await screen.findByText('Nothing to suggest yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-analytics-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('useStudioTools', () => {
  it('opens one tool at a time, keeps the latest checks, and takes a caption for the post', () => {
    const project = reelProject({ checks: [reelCheck({ name: 'kept' })] });
    const { result } = renderHook(() => useStudioTools(project));
    expect(result.current).toMatchObject({ dialog: null, checks: [reelCheck({ name: 'kept' })], caption: 'Jam night recap' });

    act(() => result.current.open('history'));
    expect(result.current.dialog).toBe('history');
    act(() => result.current.close());
    expect(result.current.dialog).toBeNull();

    act(() => result.current.setChecks([reelCheck({ name: 'fresh' })]));
    expect(result.current.checks).toEqual([reelCheck({ name: 'fresh' })]);

    act(() => result.current.useVariant(reelVariant()));
    expect(result.current.caption).toBe('Sundays at HSR\n\n#pickleball #hsr');
    expect(notifySuccess).toHaveBeenCalledTimes(1);
  });
});

describe('StudioDialogs', () => {
  const tools = (dialog: StudioTools['dialog']): StudioTools =>
    ({ dialog, open: vi.fn(), close: vi.fn(), checks: [], setChecks: vi.fn(), caption: '', useVariant: vi.fn() }) as unknown as StudioTools;

  it('mounts only the tool that is open', () => {
    answerQuery(REEL_ANALYTICS, { data: { reelAnalytics: reelAnalytics() } });
    const project = reelProject();
    const { rerender } = renderWithProviders(<StudioDialogs tools={tools(null)} project={project} actions={actions()} />);
    for (const kind of ['reel-validate-dialog', 'reel-variants-dialog', 'reel-history-drawer', 'reel-analytics-drawer']) {
      expect(screen.queryByTestId(kind)).not.toBeInTheDocument();
    }
    rerender(<StudioDialogs tools={tools('validate')} project={project} actions={actions()} />);
    expect(screen.getByTestId('reel-validate-dialog')).toBeInTheDocument();
    rerender(<StudioDialogs tools={tools('variants')} project={project} actions={actions()} />);
    expect(screen.getByTestId('reel-variants-dialog')).toBeInTheDocument();
    rerender(<StudioDialogs tools={tools('history')} project={project} actions={actions()} />);
    expect(screen.getByTestId('reel-history-drawer')).toBeInTheDocument();
    rerender(<StudioDialogs tools={tools('analytics')} project={project} actions={actions()} />);
    expect(screen.getByTestId('reel-analytics-drawer')).toBeInTheDocument();
  });
});
