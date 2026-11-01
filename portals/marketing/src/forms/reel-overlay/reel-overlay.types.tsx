import { z } from 'zod';
import type { ReelOverlay } from '@duncit/gql-types';
import type { Translate } from '@duncit/shell';
import { CORNER_LABEL, valuesOf } from '../../pages/reels/editor/labels';
import { REEL_EDIT_LIMITS } from '../../pages/reels/editor/limits';
import { numberIn, toMs, toPercent, toSeconds, toShare } from '../reel-live';

/** A picture on a scene — a logo or a sticker — and when it shows. */
export const buildReelOverlaySchema = (t: Translate, sceneSeconds: number) =>
  z.object({
    corner: z.enum(valuesOf(CORNER_LABEL)),
    width_pct: numberIn(t, REEL_EDIT_LIMITS.minOverlayWidth, REEL_EDIT_LIMITS.maxOverlayWidth),
    opacity_pct: numberIn(t, toPercent(REEL_EDIT_LIMITS.minOverlayOpacity), 100),
    start_s: numberIn(t, 0, sceneSeconds),
    duration_s: numberIn(t, 0, sceneSeconds),
  });

export type ReelOverlayFormValues = z.output<ReturnType<typeof buildReelOverlaySchema>>;

export const overlayToForm = (overlay: ReelOverlay): ReelOverlayFormValues => ({
  corner: overlay.corner,
  width_pct: overlay.width_pct,
  opacity_pct: toPercent(overlay.opacity),
  start_s: toSeconds(overlay.start_ms),
  duration_s: toSeconds(overlay.duration_ms),
});

export const formToOverlay = (values: ReelOverlayFormValues): Partial<ReelOverlay> => ({
  corner: values.corner,
  width_pct: Math.round(values.width_pct),
  opacity: toShare(values.opacity_pct),
  start_ms: toMs(values.start_s),
  duration_ms: toMs(values.duration_s),
});

export interface ReelOverlayFormProps {
  overlay: ReelOverlay;
  sceneSeconds: number;
  onChange: (patch: Partial<ReelOverlay>) => void;
}
