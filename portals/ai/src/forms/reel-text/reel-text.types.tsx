import { z } from 'zod';
import type { ReelText } from '@duncit/gql-types';
import type { Translate } from '@duncit/shell';
import { ANIMATION_LABEL, POSITION_LABEL, STYLE_LABEL, valuesOf } from '../../pages/reels/editor/labels';
import { REEL_EDIT_LIMITS } from '../../pages/reels/editor/limits';
import { hexColor, numberIn, optionalHexColor, toMs, toSeconds } from '../reel-live';

/**
 * Words on a scene. `sceneSeconds` bounds when they can appear and how long they
 * stay; a stay of 0 keeps them on until the scene ends.
 */
export const buildReelTextSchema = (t: Translate, sceneSeconds: number) => {
  const wordsError = t('ai.reels.editor.errorWords', { vars: { max: REEL_EDIT_LIMITS.maxTextLength } });
  return z.object({
    text: z.string().trim().min(1, wordsError).max(REEL_EDIT_LIMITS.maxTextLength, wordsError),
    position: z.enum(valuesOf(POSITION_LABEL)),
    style: z.enum(valuesOf(STYLE_LABEL)),
    animation: z.enum(valuesOf(ANIMATION_LABEL)),
    start_s: numberIn(t, 0, sceneSeconds),
    duration_s: numberIn(t, 0, sceneSeconds),
    color: hexColor(t),
    background: optionalHexColor(t),
  });
};

export type ReelTextFormValues = z.output<ReturnType<typeof buildReelTextSchema>>;

export const textToForm = (text: ReelText): ReelTextFormValues => ({
  text: text.text,
  position: text.position,
  style: text.style,
  animation: text.animation,
  start_s: toSeconds(text.start_ms),
  duration_s: toSeconds(text.duration_ms),
  color: text.color,
  background: text.background,
});

export const formToText = (values: ReelTextFormValues): Partial<ReelText> => ({
  text: values.text,
  position: values.position,
  style: values.style,
  animation: values.animation,
  start_ms: toMs(values.start_s),
  duration_ms: toMs(values.duration_s),
  color: values.color.toUpperCase(),
  background: values.background.toUpperCase(),
});

export interface ReelTextFormProps {
  text: ReelText;
  /** How long the text's scene runs, in seconds. */
  sceneSeconds: number;
  onChange: (patch: Partial<ReelText>) => void;
}
