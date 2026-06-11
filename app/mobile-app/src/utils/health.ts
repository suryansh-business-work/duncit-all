import { semantic } from '@duncit/auth-tokens';

/** A health record shape shared by the meter + breakdown (account & venue). */
export interface HealthScoreLike {
  base_score: number;
  delta_sum: number;
  total_score: number;
  band: string;
  adjustments: {
    id: string;
    delta: number;
    remark: string;
    created_by_name: string;
    created_at: string;
  }[];
}

/** Band → ring/chip colour — mirrors mWeb's HealthMeter/HealthBreakdown palette. */
export const HEALTH_BAND_COLOR: Record<string, string> = {
  RED: semantic.error,
  YELLOW: semantic.warning,
  GREEN: semantic.success,
};

/** Band → short status label — mWeb's HealthBreakdown BAND_LABEL. */
export const HEALTH_BAND_LABEL: Record<string, string> = {
  RED: 'Needs attention',
  YELLOW: 'Doing OK',
  GREEN: 'In great shape',
};

/** Colour for a band, defaulting to the info colour for unknown bands. */
export function healthBandColor(band: string): string {
  return HEALTH_BAND_COLOR[band] ?? semantic.info;
}

/** Label for a band, defaulting to a neutral label for unknown bands. */
export function healthBandLabel(band: string): string {
  return HEALTH_BAND_LABEL[band] ?? 'Health';
}

/** Clamp a raw score into the 0–100 gauge range (rounded). */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Signed delta string, e.g. "+5" / "-3". */
export function adjustmentSign(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/** "Base score: N · Admin adjustment: ±M" caption (admin part only when non-zero). */
export function healthScoreCaption(score: HealthScoreLike): string {
  const base = `Base score: ${score.base_score}`;
  if (score.delta_sum === 0) return base;
  return `${base} · Admin adjustment: ${adjustmentSign(score.delta_sum)}`;
}
