import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { REEL_EDIT_LIMITS } from '../../pages/reels/editor/limits';
import type { ReelScript } from '../../pages/reels/types';
import { numberIn, toMs, toSeconds } from '../reel-live';

/** A shot direction or a footage query is a phrase, not a paragraph. */
export const MAX_SHOT_LENGTH = 200;
export const MAX_QUERY_LENGTH = 120;

/**
 * The script as the operator edits it before it is applied: one hook, the
 * scenes in order (each in seconds, the unit a person thinks in), and the
 * call to action. The bounds are the timeline's own, so a scene the script
 * step accepts is a scene the storyboard can hold.
 */
export const buildReelScriptSchema = (t: Translate) => {
  const wordsError = t('ai.reels.editor.errorWords', { vars: { max: REEL_EDIT_LIMITS.maxTextLength } });
  return z.object({
    hook: z.string().trim().min(1, t('ai.reels.create.hookRequired')).max(REEL_EDIT_LIMITS.maxTextLength, wordsError),
    scenes: z
      .array(
        z.object({
          text: z.string().trim().min(1, wordsError).max(REEL_EDIT_LIMITS.maxTextLength, wordsError),
          shot: z.string().trim().max(MAX_SHOT_LENGTH, t('ai.reels.create.shotMax', { vars: { max: MAX_SHOT_LENGTH } })),
          duration_s: numberIn(t, REEL_EDIT_LIMITS.minSceneMs / 1000, REEL_EDIT_LIMITS.maxSceneMs / 1000),
          asset_query: z.string().trim().max(MAX_QUERY_LENGTH, t('ai.reels.create.queryMax', { vars: { max: MAX_QUERY_LENGTH } })),
        })
      )
      .min(1, t('ai.reels.create.scenesRequired'))
      .max(REEL_EDIT_LIMITS.maxScenes, t('ai.reels.create.scenesMax', { vars: { max: REEL_EDIT_LIMITS.maxScenes } })),
    cta: z.string().trim().max(REEL_EDIT_LIMITS.maxTextLength, wordsError),
  });
};

export type ReelScriptFormValues = z.output<ReturnType<typeof buildReelScriptSchema>>;
export type ReelScriptSceneValues = ReelScriptFormValues['scenes'][number];

/** The first hook is the one the writer led with; the others are the choices. */
export const scriptToForm = (script: ReelScript): ReelScriptFormValues => ({
  hook: script.hooks[0] ?? '',
  scenes: script.scenes.map((scene) => ({
    text: scene.text,
    shot: scene.shot,
    duration_s: toSeconds(scene.duration_ms),
    asset_query: scene.asset_query,
  })),
  cta: script.cta,
});

/** What is applied: the chosen hook alone, and the scenes back in milliseconds. */
export const formToScript = (values: ReelScriptFormValues): ReelScript => ({
  hooks: [values.hook],
  scenes: values.scenes.map((scene) => ({
    text: scene.text,
    shot: scene.shot,
    duration_ms: toMs(scene.duration_s),
    asset_query: scene.asset_query,
  })),
  cta: values.cta,
});

/** A scene added by hand, before it is written. */
export const blankScriptScene = (): ReelScriptSceneValues => ({ text: '', shot: '', duration_s: 3, asset_query: '' });

export interface ReelScriptFormProps {
  /** The script as the writer answered — its hooks are the choices offered. */
  script: ReelScript;
  submitting: boolean;
  onSubmit: (script: ReelScript) => void;
}
