import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { briefLengthSeconds, type ReelBriefFormValues } from '../../../../forms/reel-brief';
import { APPLY_REEL_STORYBOARD, GENERATE_REEL_IDEAS, GENERATE_REEL_SCRIPT, REEL_PROJECT } from '../../queries';
import type { ReelConcept, ReelScript } from '../../types';
import { briefText } from './briefText';

export type CreateStep = 'brief' | 'concepts' | 'script' | 'apply';
export const CREATE_STEPS: readonly CreateStep[] = ['brief', 'concepts', 'script', 'apply'];

/** How many concepts one ask brings back. */
export const IDEA_COUNT = 4;

interface IdeasData {
  generateReelIdeas: { run_id: string; concepts: ReelConcept[] };
}

interface ScriptData {
  generateReelScript: { run_id: string } & ReelScript;
}

export interface CreateFlowState {
  step: CreateStep;
  brief: ReelBriefFormValues | null;
  concepts: ReelConcept[];
  concept: ReelConcept | null;
  script: ReelScript | null;
  /** The run behind the last step that made one — what the progress panel follows. */
  runId: string | null;
  /** True while a step's request is out. */
  busy: boolean;
  /** Why the last step failed, in the operator's words; empty otherwise. */
  error: string;
  /** True once the storyboard has been put on the timeline. */
  applied: boolean;
}

const START: CreateFlowState = { step: 'brief', brief: null, concepts: [], concept: null, script: null, runId: null, busy: false, error: '', applied: false };

/** Concepts the writer has already offered are not offered twice. */
const mergeConcepts = (held: ReelConcept[], fresh: ReelConcept[]): ReelConcept[] => {
  const seen = new Set(held.map((concept) => concept.id));
  return [...held, ...fresh.filter((concept) => !seen.has(concept.id))];
};

/**
 * Create with AI, step by step: a brief becomes concepts, a concept becomes a
 * script, the script becomes the storyboard on the timeline. Each step is one
 * request; the answer is kept here so going back and forward loses nothing.
 *
 * A step can be abandoned while its request is out: the generation counter
 * moves on, and an answer from an earlier generation is dropped on arrival
 * rather than overwriting whatever the operator did meanwhile.
 */
export function useCreateFlow(projectId: string) {
  const { t } = useTranslation();
  const [state, setState] = useState<CreateFlowState>(START);
  const generation = useRef(0);
  const refetch = useMemo(
    () => ({ refetchQueries: [{ query: REEL_PROJECT, variables: { id: projectId } }], awaitRefetchQueries: true }),
    [projectId]
  );
  const [ideasMutation] = useMutation<IdeasData>(GENERATE_REEL_IDEAS);
  const [scriptMutation] = useMutation<ScriptData>(GENERATE_REEL_SCRIPT);
  const [applyMutation] = useMutation(APPLY_REEL_STORYBOARD, refetch);

  /** Runs one step's request; the result is applied only if nothing abandoned the step meanwhile. */
  const run = useCallback(
    async (request: () => Promise<(current: CreateFlowState) => CreateFlowState>, fallbackKey: string) => {
      const mine = (generation.current += 1);
      setState((current) => ({ ...current, busy: true, error: '' }));
      try {
        const settle = await request();
        if (mine !== generation.current) return;
        setState((current) => ({ ...settle(current), busy: false }));
      } catch (error) {
        if (mine !== generation.current) return;
        setState((current) => ({ ...current, busy: false, error: parseApiError(error, t(fallbackKey)) }));
      }
    },
    [t]
  );

  const findIdeas = useCallback(
    (brief: ReelBriefFormValues) =>
      run(async () => {
        const { data } = await ideasMutation({ variables: { project_id: projectId, brief: briefText(brief, t), count: IDEA_COUNT } });
        const answer = data?.generateReelIdeas;
        return (current) => ({
          ...current,
          step: 'concepts',
          brief,
          concepts: answer ? mergeConcepts(current.brief === brief ? current.concepts : [], answer.concepts) : current.concepts,
          runId: answer?.run_id ?? current.runId,
        });
      }, 'ai.reels.create.ideasFailed'),
    [ideasMutation, projectId, run, t]
  );

  /** The same brief again, for more concepts beside the ones already offered. */
  const moreIdeas = useCallback(() => {
    if (state.brief) return findIdeas(state.brief);
    return Promise.resolve();
  }, [findIdeas, state.brief]);

  const pickConcept = useCallback((concept: ReelConcept) => setState((current) => ({ ...current, concept })), []);

  const writeScript = useCallback(() => {
    const { brief, concept } = state;
    if (!brief || !concept) return Promise.resolve();
    return run(async () => {
      const { data } = await scriptMutation({
        variables: {
          project_id: projectId,
          concept: { title: concept.title, hook: concept.hook, angle: concept.angle },
          length_s: briefLengthSeconds(brief),
          tone: brief.tone,
        },
      });
      const answer = data?.generateReelScript;
      return (current) => ({
        ...current,
        step: 'script',
        script: answer ? { hooks: answer.hooks, scenes: answer.scenes, cta: answer.cta } : current.script,
        runId: answer?.run_id ?? current.runId,
      });
    }, 'ai.reels.create.scriptFailed');
  }, [projectId, run, scriptMutation, state]);

  const useScript = useCallback((script: ReelScript) => setState((current) => ({ ...current, script, step: 'apply', applied: false })), []);

  const applyStoryboard = useCallback(
    (autoMedia: boolean) => {
      const { script } = state;
      if (!script) return Promise.resolve();
      return run(async () => {
        await applyMutation({ variables: { project_id: projectId, script, auto_media: autoMedia } });
        return (current) => ({ ...current, applied: true });
      }, 'ai.reels.create.applyFailed');
    },
    [applyMutation, projectId, run, state]
  );

  /** Back to an earlier step; what was made after it is kept for when the operator returns. */
  const goTo = useCallback((step: CreateStep) => setState((current) => ({ ...current, step, error: '' })), []);

  const abandon = useCallback(() => {
    generation.current += 1;
    setState((current) => ({ ...current, busy: false }));
  }, []);

  return { ...state, findIdeas, moreIdeas, pickConcept, writeScript, useScript, applyStoryboard, goTo, abandon };
}

export type CreateFlow = ReturnType<typeof useCreateFlow>;
