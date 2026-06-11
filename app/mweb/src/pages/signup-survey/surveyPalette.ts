// Vibrant palette used for super-categories / categories in the signup survey.
// Colors are hashed deterministically to a category id so the same chip keeps
// the same hue across renders.

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
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function colorForId(id: string): string {
  return SURVEY_COLORS[hashId(id) % SURVEY_COLORS.length];
}

// Render the category icon if it looks like an emoji, otherwise undefined so
// the chip falls back to a plain label.
export function emojiFromIcon(icon?: string | null): string | undefined {
  if (!icon) return undefined;
  const trimmed = icon.trim();
  if (!trimmed) return undefined;
  // Heuristic — short non-ASCII strings are treated as emoji glyphs.
  // Anything longer (e.g. "mui:Restaurant") is ignored.
  if (trimmed.length <= 4 && /[^\x00-\x7F]/.test(trimmed)) return trimmed;
  return undefined;
}
