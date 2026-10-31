import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { ASPECT_LABEL, CAPTION_STYLE_LABEL, CORNER_LABEL, valuesOf } from '../../pages/reels/editor/labels';
import { REEL_EDIT_LIMITS } from '../../pages/reels/editor/limits';
import type { ReelSettingsPatch } from '../../pages/reels/editor/specEdits';
import type { ReelSpec } from '../../pages/reels/types';
import { numberIn, optionalHexColor, toPercent, toShare } from '../reel-live';

/** A watermark wider than half the frame is a poster, not a mark. */
export const MAX_WATERMARK_PCT = 50;

/** The reel as a whole: its frame, how its words are drawn, the brand on it, and how loud the voiceover is. */
export const buildReelSettingsSchema = (t: Translate) =>
  z.object({
    aspect: z.enum(valuesOf(ASPECT_LABEL)),
    caption_style: z.enum(valuesOf(CAPTION_STYLE_LABEL)),
    watermark_asset_id: z.string(),
    watermark_corner: z.enum(valuesOf(CORNER_LABEL)),
    watermark_width_pct: numberIn(t, REEL_EDIT_LIMITS.minOverlayWidth, MAX_WATERMARK_PCT),
    primary_color: optionalHexColor(t),
    voiceover_volume_pct: numberIn(t, 0, 100),
  });

export type ReelSettingsFormValues = z.output<ReturnType<typeof buildReelSettingsSchema>>;

export const settingsToForm = (spec: ReelSpec): ReelSettingsFormValues => ({
  aspect: spec.aspect,
  caption_style: spec.captions.style,
  watermark_asset_id: spec.brand.watermark_asset_id,
  watermark_corner: spec.brand.watermark_corner,
  watermark_width_pct: spec.brand.watermark_width_pct,
  primary_color: spec.brand.primary_color,
  voiceover_volume_pct: toPercent(spec.voiceover?.volume ?? 1),
});

/** What one change to the form means for the reel: its settings, and the voiceover's volume. */
export interface ReelSettingsChange {
  settings: ReelSettingsPatch;
  /** 0–1. Applied only when the reel has a voiceover. */
  voiceover_volume: number;
}

export const formToSettings = (values: ReelSettingsFormValues): ReelSettingsChange => ({
  settings: {
    aspect: values.aspect,
    captions: { style: values.caption_style },
    brand: {
      watermark_asset_id: values.watermark_asset_id,
      watermark_corner: values.watermark_corner,
      watermark_width_pct: Math.round(values.watermark_width_pct),
      primary_color: values.primary_color.toUpperCase(),
    },
  },
  voiceover_volume: toShare(values.voiceover_volume_pct),
});

export interface ReelSettingsFormProps {
  spec: ReelSpec;
  /** The reel's pictures, one of which can be the watermark. */
  pictures: readonly { value: string; label: string }[];
  onChange: (change: ReelSettingsChange) => void;
}
