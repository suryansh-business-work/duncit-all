import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { notifyError } from '@duncit/dialogs';
import { CANCEL_MARKETING_RUN, MARKETING_RUN } from '../../src/pages/activity-page/queries';
import {
  APPLY_REEL_STORYBOARD,
  GENERATE_REEL_IDEAS,
  GENERATE_REEL_SCRIPT,
  GENERATE_REEL_SUBTITLES,
  GENERATE_REEL_VOICEOVER,
} from '../../src/pages/reels/queries';
import AfterApply, { subtitleSources } from '../../src/pages/reels/studio/create/AfterApply';
import ApplyStep from '../../src/pages/reels/studio/create/ApplyStep';
import { briefText, scriptNarration } from '../../src/pages/reels/studio/create/briefText';
import ConceptsStep from '../../src/pages/reels/studio/create/ConceptsStep';
import CreatePanel, { StepBody } from '../../src/pages/reels/studio/create/CreatePanel';
import RunProgress from '../../src/pages/reels/studio/create/RunProgress';
import { IDEA_COUNT, useCreateFlow, type CreateFlow } from '../../src/pages/reels/studio/create/useCreateFlow';
import { RUN_POLL_MS, runFailure, useRunWatch } from '../../src/pages/reels/studio/create/useRunWatch';
import { DEFAULT_VOICE, REEL_LENGTHS_S, languageOptions } from '../../src/pages/reels/studio/create/voices';
import { renderWithProviders } from '../testkit';
import {
  answerQuery,
  marketingRun,
  mutationOf,
  queryOptions,
  reelAsset,
  reelConcept,
  reelProject,
  reelScript,
  resetApollo,
  runStep,
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

const project = () =>
  reelProject({
    assets: [reelAsset({ id: 'v1', kind: 'VIDEO', name: 'jam.mp4' }), reelAsset({ id: 'g1', kind: 'AUDIO', source: 'GENERATED', name: 'voice.mp3' })],
  });

const ideas = (...concepts: ReturnType<typeof reelConcept>[]) => ({ data: { generateReelIdeas: { run_id: 'run-1', concepts } } });

/** Fills the brief and asks for ideas. */
const askForIdeas = async (topic = 'Sunday pickleball at HSR') => {
  fireEvent.change(screen.getByTestId('reel-brief-topic'), { target: { value: topic } });
  await waitFor(() => expect(screen.getByTestId('reel-brief-submit')).toBeEnabled());
  fireEvent.submit(screen.getByTestId('reel-brief-form'));
};

const pickConcept = (id: string) => fireEvent.click(within(screen.getByTestId(`reel-concept-${id}`)).getByRole('radio'));

beforeEach(() => {
  resetApollo();
  vi.mocked(notifyError).mockClear();
  answerQuery(MARKETING_RUN, { data: { marketingRun: marketingRun({ status: 'COMPLETED', steps: [runStep({ status: 'OK', ms: 1200 })] }) } });
});

describe('CreatePanel — the whole flow', () => {
  it('turns a brief into concepts, a script and a storyboard, then offers voice and subtitles', async () => {
    mutationOf(GENERATE_REEL_IDEAS).mockResolvedValue(ideas(reelConcept(), reelConcept({ id: 'c2', title: 'Second serve' })));
    mutationOf(GENERATE_REEL_SCRIPT).mockResolvedValue({ data: { generateReelScript: reelScript() } });
    renderWithProviders(<CreatePanel project={project()} />);
    expect(screen.getByTestId('reel-create-step-brief')).toBeInTheDocument();

    await askForIdeas();
    expect(await screen.findByTestId('reel-concepts-step')).toBeInTheDocument();
    const brief = mutationOf(GENERATE_REEL_IDEAS).mock.calls[0][0]?.variables;
    expect(brief).toMatchObject({ project_id: PROJECT_ID, count: IDEA_COUNT });
    expect(String(brief?.brief)).toContain('Sunday pickleball at HSR');
    expect(String(brief?.brief)).toContain('Length: 30 seconds');
    // The run behind the step, followed live under it.
    expect(screen.getByTestId('reel-run-progress')).toBeInTheDocument();
    expect(screen.getByTestId('marketing-run-steps')).toHaveTextContent('Find ideas');
    expect(queryOptions.get(MARKETING_RUN)?.variables).toEqual({ id: 'run-1' });

    expect(screen.getByTestId('reel-concepts-continue')).toBeDisabled();
    pickConcept('c2');
    fireEvent.click(screen.getByTestId('reel-concepts-continue'));
    expect(await screen.findByTestId('reel-script-form')).toBeInTheDocument();
    expect(mutationOf(GENERATE_REEL_SCRIPT)).toHaveBeenCalledWith({
      variables: {
        project_id: PROJECT_ID,
        concept: { title: 'Second serve', hook: 'You have never seen HSR like this', angle: 'Beginners welcome' },
        length_s: 30,
        tone: 'ENERGETIC',
      },
    });

    // The writer's first hook is picked; the second is a choice.
    expect(within(screen.getByTestId('reel-script-hook-1')).getByRole('radio')).toBeChecked();
    fireEvent.click(within(screen.getByTestId('reel-script-hook-2')).getByRole('radio'));
    await waitFor(() => expect(screen.getByTestId('reel-script-submit')).toBeEnabled());
    fireEvent.submit(screen.getByTestId('reel-script-form'));
    expect(await screen.findByTestId('reel-apply-step')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reel-apply-auto-media'));
    fireEvent.click(screen.getByTestId('reel-apply-submit'));
    await waitFor(() =>
      expect(mutationOf(APPLY_REEL_STORYBOARD)).toHaveBeenCalledWith({
        variables: {
          project_id: PROJECT_ID,
          script: { hooks: ['Sundays at HSR'], scenes: [{ text: 'Sundays start here', shot: 'Court at sunrise', duration_ms: 3000, asset_query: 'pickleball sunrise' }], cta: 'Book your spot' },
          auto_media: false,
        },
      })
    );
    expect(await screen.findByTestId('reel-after-apply')).toBeInTheDocument();
    expect(screen.getByTestId('reel-apply-submit')).toHaveTextContent('Apply again');

    fireEvent.click(screen.getByTestId('reel-offer-voiceover'));
    expect(screen.getByTestId('reel-voiceover-text')).toHaveValue('Sundays start here');
    await waitFor(() => expect(screen.getByTestId('reel-voiceover-submit')).toBeEnabled());
    fireEvent.submit(screen.getByTestId('reel-voiceover-form'));
    await waitFor(() =>
      expect(mutationOf(GENERATE_REEL_VOICEOVER)).toHaveBeenCalledWith({
        variables: { project_id: PROJECT_ID, text: 'Sundays start here', voice: DEFAULT_VOICE, language: 'en-IN' },
      })
    );

    fireEvent.click(screen.getByTestId('reel-offer-subtitles'));
    expect(await screen.findByTestId('reel-subtitles-form')).toBeInTheDocument();
    // Opening subtitles folds the voiceover away; it leaves once its transition ends.
    await waitFor(() => expect(screen.queryByTestId('reel-voiceover-form')).not.toBeInTheDocument());
    fireEvent.submit(screen.getByTestId('reel-subtitles-form'));
    await waitFor(() =>
      expect(mutationOf(GENERATE_REEL_SUBTITLES)).toHaveBeenCalledWith({ variables: { project_id: PROJECT_ID, asset_id: 'v1', language: 'en-IN' } })
    );
  });

  it('goes back to the brief without losing it, and asks for more ideas beside the ones offered', async () => {
    mutationOf(GENERATE_REEL_IDEAS).mockResolvedValueOnce(ideas(reelConcept())).mockResolvedValueOnce(ideas(reelConcept(), reelConcept({ id: 'c3', title: 'Third' })));
    renderWithProviders(<CreatePanel project={project()} />);
    await askForIdeas('Pottery night');
    expect(await screen.findByTestId('reel-concept-c1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reel-concepts-more'));
    expect(await screen.findByTestId('reel-concept-c3')).toBeInTheDocument();
    // The same concept is not offered twice.
    expect(screen.getAllByTestId(/^reel-concept-/)).toHaveLength(2);

    fireEvent.click(screen.getByTestId('reel-create-goto-brief'));
    expect(screen.getByTestId('reel-brief-topic')).toHaveValue('Pottery night');
    fireEvent.click(screen.getByTestId('reel-create-goto-concepts'));
    expect(screen.getByTestId('reel-concepts-step')).toBeInTheDocument();
  });

  it('stays on the step and says why when ideas, the script or the storyboard fail', async () => {
    mutationOf(GENERATE_REEL_IDEAS).mockRejectedValueOnce(failure).mockResolvedValueOnce(ideas(reelConcept()));
    mutationOf(GENERATE_REEL_SCRIPT).mockRejectedValueOnce(failure).mockResolvedValueOnce({ data: { generateReelScript: reelScript({ hooks: [] }) } });
    mutationOf(APPLY_REEL_STORYBOARD).mockRejectedValue(failure);
    renderWithProviders(<CreatePanel project={project()} />);

    await askForIdeas();
    expect(await screen.findByTestId('reel-create-error')).toHaveTextContent('The server refused.');
    expect(screen.getByTestId('reel-brief-form')).toBeInTheDocument();
    fireEvent.submit(screen.getByTestId('reel-brief-form'));
    expect(await screen.findByTestId('reel-concepts-step')).toBeInTheDocument();
    expect(screen.queryByTestId('reel-create-error')).not.toBeInTheDocument();

    pickConcept('c1');
    fireEvent.click(screen.getByTestId('reel-concepts-continue'));
    expect(await screen.findByTestId('reel-create-error')).toHaveTextContent('The server refused.');
    fireEvent.click(screen.getByTestId('reel-concepts-continue'));
    // No hooks offered: the opening line is typed instead.
    expect(await screen.findByTestId('reel-script-hook')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('reel-script-hook'), { target: { value: 'Come early' } });
    await waitFor(() => expect(screen.getByTestId('reel-script-submit')).toBeEnabled());
    fireEvent.submit(screen.getByTestId('reel-script-form'));
    fireEvent.click(await screen.findByTestId('reel-apply-submit'));
    expect(await screen.findByTestId('reel-create-error')).toHaveTextContent('The server refused.');
    expect(screen.queryByTestId('reel-after-apply')).not.toBeInTheDocument();
  });

  it('abandons a step whose request is still out, and ignores the answer when it comes', async () => {
    let finish: (value: unknown) => void = () => undefined;
    mutationOf(GENERATE_REEL_IDEAS).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    answerQuery(MARKETING_RUN, {});
    renderWithProviders(<CreatePanel project={project()} />);
    await askForIdeas();
    expect(await screen.findByTestId('reel-run-working')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-run-abandon'));
    expect(screen.queryByTestId('reel-run-working')).not.toBeInTheDocument();
    await act(async () => finish(ideas(reelConcept())));
    expect(screen.queryByTestId('reel-concepts-step')).not.toBeInTheDocument();
    expect(screen.getByTestId('reel-brief-form')).toBeInTheDocument();
  });
});

describe('StepBody', () => {
  const flow = (over: Partial<CreateFlow>): CreateFlow =>
    ({ step: 'script', script: null, concepts: [], concept: null, brief: null, busy: false, error: '', applied: false, runId: null, ...over }) as unknown as CreateFlow;

  it('draws nothing for the script and apply steps until there is a script', () => {
    const { container, rerender } = render(<StepBody flow={flow({ step: 'script' })} project={project()} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<StepBody flow={flow({ step: 'apply' })} project={project()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('useCreateFlow', () => {
  const mount = () => renderHook(() => useCreateFlow(PROJECT_ID));
  const brief = { topic: 'Jam night', audience: '', tone: 'CALM' as const, length_s: '15' as const };

  it('does nothing for more ideas, a script or a storyboard before their step has what they need', async () => {
    const { result } = mount();
    await act(async () => {
      await result.current.moreIdeas();
      await result.current.writeScript();
      await result.current.applyStoryboard(true);
    });
    expect(mutationOf(GENERATE_REEL_IDEAS)).not.toHaveBeenCalled();
    expect(mutationOf(GENERATE_REEL_SCRIPT)).not.toHaveBeenCalled();
    expect(mutationOf(APPLY_REEL_STORYBOARD)).not.toHaveBeenCalled();
  });

  it('keeps what it had when a step answers with nothing', async () => {
    mutationOf(GENERATE_REEL_IDEAS).mockResolvedValue({ data: undefined });
    mutationOf(GENERATE_REEL_SCRIPT).mockResolvedValue({ data: undefined });
    const { result } = mount();
    await act(() => result.current.findIdeas(brief));
    expect(result.current).toMatchObject({ step: 'concepts', concepts: [], runId: null, brief });

    act(() => result.current.pickConcept(reelConcept()));
    await act(() => result.current.writeScript());
    expect(result.current).toMatchObject({ step: 'script', script: null });
  });

  it('starts the concepts over for a new brief', async () => {
    mutationOf(GENERATE_REEL_IDEAS).mockResolvedValueOnce(ideas(reelConcept())).mockResolvedValueOnce(ideas(reelConcept({ id: 'c9' })));
    const { result } = mount();
    await act(() => result.current.findIdeas(brief));
    await act(() => result.current.findIdeas({ ...brief, topic: 'Something else' }));
    expect(result.current.concepts.map((concept) => concept.id)).toEqual(['c9']);
  });

  it('uses a script and applies it, with the run id of the last step kept', async () => {
    mutationOf(GENERATE_REEL_IDEAS).mockResolvedValue(ideas(reelConcept()));
    const { result } = mount();
    await act(() => result.current.findIdeas(brief));
    act(() => result.current.useScript({ hooks: ['Hi'], scenes: [], cta: '' }));
    expect(result.current).toMatchObject({ step: 'apply', applied: false, runId: 'run-1' });
    await act(() => result.current.applyStoryboard(true));
    expect(result.current.applied).toBe(true);
    expect(mutationOf(APPLY_REEL_STORYBOARD)).toHaveBeenCalledWith({ variables: { project_id: PROJECT_ID, script: { hooks: ['Hi'], scenes: [], cta: '' }, auto_media: true } });
  });

  it('drops a failure that arrives after the step was abandoned', async () => {
    let fail: (reason: unknown) => void = () => undefined;
    mutationOf(GENERATE_REEL_IDEAS).mockReturnValue(new Promise((_resolve, reject) => (fail = reject)));
    const { result } = mount();
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.findIdeas(brief);
    });
    expect(result.current.busy).toBe(true);
    act(() => result.current.abandon());
    await act(async () => {
      fail(failure);
      await pending;
    });
    expect(result.current).toMatchObject({ busy: false, error: '', step: 'brief' });
  });
});

describe('useRunWatch', () => {
  it('asks nothing without a run', () => {
    const { result } = renderHook(() => useRunWatch(null));
    expect(result.current).toMatchObject({ run: null, active: false, failure: '' });
    expect(queryOptions.get(MARKETING_RUN)?.skip).toBe(true);
  });

  it('polls a run every two seconds until it ends, then stops', () => {
    answerQuery(MARKETING_RUN, { data: { marketingRun: marketingRun({ status: 'RUNNING' }) } });
    const { result, rerender } = renderHook(() => useRunWatch('run-1'));
    expect(result.current.active).toBe(true);
    expect(queryOptions.get(MARKETING_RUN)?.pollInterval).toBe(RUN_POLL_MS);

    answerQuery(MARKETING_RUN, { data: { marketingRun: marketingRun({ status: 'COMPLETED' }) } });
    rerender();
    expect(result.current.active).toBe(false);
    expect(queryOptions.get(MARKETING_RUN)?.pollInterval).toBe(0);
  });

  it('ignores a run other than the one asked for, and names a failure', () => {
    answerQuery(MARKETING_RUN, { data: { marketingRun: marketingRun({ id: 'run-9', status: 'FAILED', error: 'Model timed out' }) } });
    const { result, rerender } = renderHook(({ id }) => useRunWatch(id), { initialProps: { id: 'run-1' } });
    expect(result.current.run).toBeNull();
    rerender({ id: 'run-9' });
    expect(result.current.failure).toBe('Model timed out');
  });
});

describe('runFailure', () => {
  it('reads the run’s own error, then its first failed step’s, for a run that did not finish', () => {
    expect(runFailure(null)).toBe('');
    expect(runFailure(marketingRun({ status: 'COMPLETED', error: 'ignored' }))).toBe('');
    expect(runFailure(marketingRun({ status: 'PARTIAL', error: '', steps: [runStep({ status: 'OK' }), runStep({ key: 'b', status: 'FAILED', error: 'No footage' })] }))).toBe('No footage');
    expect(runFailure(marketingRun({ status: 'CANCELLED', error: '', steps: [] }))).toBe('');
  });
});

describe('RunProgress', () => {
  it('is nothing until a step is working or a run is known', () => {
    const { container } = renderWithProviders(<RunProgress runId={null} working={false} onAbandon={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the working line with a way out before the run is known', () => {
    answerQuery(MARKETING_RUN, {});
    const onAbandon = vi.fn();
    renderWithProviders(<RunProgress runId={null} working onAbandon={onAbandon} />);
    expect(screen.getByTestId('reel-run-working')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-run-abandon'));
    expect(onAbandon).toHaveBeenCalledTimes(1);
  });

  it('stops a run that is still going, and says when the server would not', async () => {
    answerQuery(MARKETING_RUN, { data: { marketingRun: marketingRun({ status: 'RUNNING' }) } });
    renderWithProviders(<RunProgress runId="run-1" working={false} onAbandon={vi.fn()} />);
    expect(screen.queryByTestId('reel-run-working')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-run-cancel'));
    await waitFor(() => expect(mutationOf(CANCEL_MARKETING_RUN)).toHaveBeenCalledWith({ variables: { id: 'run-1' } }));
    expect(notifyError).not.toHaveBeenCalled();

    mutationOf(CANCEL_MARKETING_RUN).mockRejectedValue(failure);
    fireEvent.click(screen.getByTestId('reel-run-cancel'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('The server refused.'));
  });

  it('reports a run that failed, and a run that could not be read', () => {
    answerQuery(MARKETING_RUN, { data: { marketingRun: marketingRun({ status: 'FAILED', error: 'Model timed out' }) }, error: new Error('offline') });
    renderWithProviders(<RunProgress runId="run-1" working={false} onAbandon={vi.fn()} />);
    expect(screen.getByTestId('reel-run-error')).toHaveTextContent('Model timed out');
    expect(screen.getByTestId('reel-run-unreadable')).toHaveTextContent('offline');
    expect(screen.queryByTestId('reel-run-cancel')).not.toBeInTheDocument();
  });
});

describe('ConceptsStep', () => {
  it('picks a concept, asks for more, and continues only once one is chosen', () => {
    const onPick = vi.fn();
    const onMore = vi.fn();
    const onContinue = vi.fn();
    const { rerender } = renderWithProviders(
      <ConceptsStep concepts={[reelConcept()]} chosen={null} busy={false} onPick={onPick} onMore={onMore} onContinue={onContinue} />
    );
    expect(screen.getByTestId('reel-concepts-continue')).toBeDisabled();
    fireEvent.click(within(screen.getByTestId('reel-concept-c1')).getByRole('radio'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }));
    // A value that names no concept picks nothing.
    fireEvent.change(within(screen.getByTestId('reel-concept-c1')).getByRole('radio'), { target: { value: 'nope', checked: true } });
    expect(onPick).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('reel-concepts-more'));
    expect(onMore).toHaveBeenCalledTimes(1);

    rerender(<ConceptsStep concepts={[reelConcept()]} chosen={reelConcept()} busy={false} onPick={onPick} onMore={onMore} onContinue={onContinue} />);
    fireEvent.click(screen.getByTestId('reel-concepts-continue'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe('ApplyStep and AfterApply', () => {
  it('applies with the footage switch as set, and offers nothing more until applied', () => {
    const onApply = vi.fn();
    const { rerender } = renderWithProviders(<ApplyStep project={project()} script={reelScript()} busy={false} applied={false} onApply={onApply} />);
    expect(screen.queryByTestId('reel-after-apply')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-apply-submit'));
    expect(onApply).toHaveBeenCalledWith(true);
    rerender(<ApplyStep project={project()} script={reelScript()} busy={false} applied onApply={onApply} />);
    expect(screen.getByTestId('reel-after-apply')).toBeInTheDocument();
  });

  it('opens one offer at a time and closes it again from the same button', () => {
    renderWithProviders(<AfterApply project={project()} script={reelScript()} />);
    fireEvent.click(screen.getByTestId('reel-offer-voiceover'));
    expect(screen.getByTestId('reel-voiceover-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reel-offer-voiceover'));
    expect(screen.getByTestId('reel-offer-voiceover')).toHaveAttribute('aria-expanded', 'false');
  });

  it('says why the subtitles could not be written', async () => {
    mutationOf(GENERATE_REEL_SUBTITLES).mockRejectedValueOnce(failure);
    renderWithProviders(<AfterApply project={project()} script={reelScript()} />);
    fireEvent.click(screen.getByTestId('reel-offer-subtitles'));
    fireEvent.submit(await screen.findByTestId('reel-subtitles-form'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('The server refused.'));
    expect(mutationOf(GENERATE_REEL_SUBTITLES)).toHaveBeenCalledWith({ variables: { project_id: PROJECT_ID, asset_id: 'v1', language: 'en-IN' } });
  });

  it('offers subtitles from generated speech and clips with sound only', () => {
    expect(subtitleSources(project()).map((source) => source.value)).toEqual(['v1', 'g1']);
    expect(subtitleSources({ assets: [reelAsset({ id: 'p1', kind: 'IMAGE' })] })).toEqual([]);
  });
});

describe('the brief and the script as text', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) => `${key}:${JSON.stringify(options?.vars ?? {})}`;

  it('writes the topic, then the audience when there is one, the tone and the length', () => {
    const text = briefText({ topic: ' Jam night ', audience: 'Beginners', tone: 'CALM', length_s: '45' }, t);
    expect(text.split('\n')).toEqual([
      'Jam night',
      'ai.reels.create.briefAudience:{"audience":"Beginners"}',
      'ai.reels.create.briefTone:{"tone":"ai.reels.create.toneCalm:{}"}',
      'ai.reels.create.briefLength:{"seconds":45}',
    ]);
    expect(briefText({ topic: 'Jam night', audience: '  ', tone: 'CALM', length_s: '15' }, t)).not.toContain('briefAudience');
  });

  it('joins the scenes’ lines, skipping empty ones', () => {
    expect(scriptNarration([{ text: ' One ' }, { text: '' }, { text: 'Two' }])).toBe('One\nTwo');
  });
});

describe('languageOptions', () => {
  it('offers the workspace’s locales by their English name, else the platform’s list', () => {
    expect(languageOptions([{ code: 'hi-IN', label: 'हिन्दी', english_label: 'Hindi (India)' }, { code: 'ta-IN', label: 'தமிழ்', english_label: '' }])).toEqual([
      { value: 'hi-IN', label: 'Hindi (India)' },
      { value: 'ta-IN', label: 'தமிழ்' },
    ]);
    const everything = languageOptions([]);
    expect(everything.length).toBeGreaterThan(50);
    expect(everything.some((option) => option.value === 'en-IN')).toBe(true);
    expect(REEL_LENGTHS_S).toEqual([15, 30, 45, 60]);
  });
});
