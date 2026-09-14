// Palette used for super-categories / categories in the signup survey.
// Colors are hashed deterministically to a category id so the same chip keeps
// the same hue across renders. Every hue is at least 4.5:1 against white, so
// the white label on a selected chip passes WCAG 1.4.3; unselected chips and
// group pills keep the hue as a tint and write their text in the theme ink.

export const SURVEY_COLORS = [
  '#c62828', // brand red
  '#15803d', // green
  '#b45309', // orange
  '#7c3aed', // purple
  '#be185d', // pink
  '#0e7490', // cyan
  '#1d4ed8', // blue
  '#c2410c', // amber-orange
  '#0f766e', // teal
  '#a16207', // yellow
  '#9333ea', // violet
  '#b91c1c', // red
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + (id.codePointAt(i) ?? 0)) >>> 0;
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
