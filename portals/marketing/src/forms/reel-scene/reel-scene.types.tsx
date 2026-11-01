import { z } from 'zod';
import type { ReelScene } from '@duncit/gql-types';
import type { Translate } from '@duncit/shell';
import { FIT_LABEL, MOTION_LABEL, TRANSITION_LABEL, valuesOf } from '../../pages/reels/editor/labels';
import { REEL_EDIT_LIMITS } from '../../pages/reels/editor/limits';
import { hexColor, numberIn, toMs, toPercent, toSeconds, toShare } from '../reel-live';

/** The longest a trim can reach — far past any clip; the server clamps it to the real end. */
const MAX_TRIM_SECONDS = 3600;

/**
 * One scene as the inspector edits it, in the units a person thinks in:
 * seconds rather than milliseconds, percent rather than 0–1. `maxSeconds` is
 * how long the scene's footage can actually run from its trim.
 */
export const buildReelSceneSchema = (t: Translate, maxSeconds: number) =>
  z.object({
    asset_id: z.string(),
    duration_s: numberIn(t, REEL_EDIT_LIMITS.minSceneMs / 1000, maxSeconds),
    trim_s: numberIn(t, 0, MAX_TRIM_SECONDS),
    speed: numberIn(t, REEL_EDIT_LIMITS.minRate, REEL_EDIT_LIMITS.maxRate),
    volume_pct: numberIn(t, 0, 100),
    fit: z.enum(valuesOf(FIT_LABEL)),
    motion: z.enum(valuesOf(MOTION_LABEL)),
    transition: z.enum(valuesOf(TRANSITION_LABEL)),
    background: hexColor(t),
  });

export type ReelSceneFormValues = z.output<ReturnType<typeof buildReelSceneSchema>>;

export const sceneToForm = (scene: ReelScene): ReelSceneFormValues => ({
  asset_id: scene.asset_id,
  duration_s: toSeconds(scene.duration_ms),
  trim_s: toSeconds(scene.trim_start_ms),
  speed: scene.playback_rate,
  volume_pct: toPercent(scene.volume),
  fit: scene.fit,
  motion: scene.motion,
  transition: scene.transition,
  background: scene.background,
});

export const formToScene = (values: ReelSceneFormValues): Partial<ReelScene> => ({
  asset_id: values.asset_id,
  duration_ms: toMs(values.duration_s),
  trim_start_ms: toMs(values.trim_s),
  playback_rate: values.speed,
  volume: toShare(values.volume_pct),
  fit: values.fit,
  motion: values.motion,
  transition: values.transition,
  background: values.background.toUpperCase(),
});

export interface ReelSceneFormProps {
  scene: ReelScene;
  /** Footage the scene can show, plus "Colour card" as the empty value. */
  footage: readonly { value: string; label: string }[];
  /** Whether the scene's footage is a video — trim, speed and volume apply only then. */
  isVideo: boolean;
  maxSeconds: number;
  onChange: (patch: Partial<ReelScene>) => void;
}
