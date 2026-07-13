// Vibrant palette for the signup-survey chips — a direct port of mWeb's
// surveyPalette so a category keeps the same hue on web and native.

export const SURVEY_COLORS = [
  '#ff5757', // brand
  '#22c55e', // green
  '#f59e0b', // orange
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#f97316', // amber-orange
  '#14b8a6', // teal
  '#eab308', // yellow
  '#a855f7', // violet
  '#ef4444', // red
] as const;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Deterministic hue for a category id (same algorithm as mWeb). */
export function colorForId(id: string): string {
  return SURVEY_COLORS[hashId(id) % SURVEY_COLORS.length] as string;
}

/** Short non-ASCII icon strings are treated as emoji; longer ones are ignored. */
export function emojiFromIcon(icon?: string | null): string | undefined {
  const trimmed = icon?.trim();
  if (!trimmed) return undefined;
  // eslint-disable-next-line no-control-regex
  if (trimmed.length <= 4 && /[^\x00-\x7F]/.test(trimmed)) return trimmed;
  return undefined;
}

export const MIN_PICKS = 3;

/** Convert a hex colour to an `rgba()` string at the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = Number.parseInt(m[1] as string, 16);
  const g = Number.parseInt(m[2] as string, 16);
  const b = Number.parseInt(m[3] as string, 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
