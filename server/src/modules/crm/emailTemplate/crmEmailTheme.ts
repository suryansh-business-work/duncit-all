import { EMAIL_COLOR as C, EMAIL_DARK as D, EMAIL_SPACE as S, EMAIL_TYPE as F } from '@services/email/catalogue/tokens';

/**
 * The CRM's own email look (CRM › Email Templates › Settings › Theme).
 *
 * Every CRM email is drawn from the shared tokens (`catalogue/tokens.ts`):
 * the starter, the AI writer and the header/footer fragment all write those
 * exact values inline. So the theme is applied at RENDER time, as a remap
 * from each shared token to the CRM's choice, rather than by asking each
 * template (or the AI) to write the CRM's colours. A theme change therefore
 * reaches every existing template, the preview and the next send at once,
 * and a theme left at its defaults renders byte-for-byte what it did before.
 */

export const CRM_EMAIL_COLOR_MODES = ['AUTO', 'LIGHT'] as const;
export type CrmEmailColorMode = (typeof CRM_EMAIL_COLOR_MODES)[number];

/** A font the theme can pick. Stored by key so no CSS ever comes from input. */
export interface CrmEmailFont {
  key: string;
  label: string;
  stack: string;
  /** Google Fonts stylesheet for clients that load web fonts; the stack falls back. */
  href?: string;
}

const GOOGLE = 'https://fonts.googleapis.com/css2?display=swap&family=';

export const CRM_EMAIL_FONTS: readonly CrmEmailFont[] = [
  { key: 'inter', label: 'Inter', stack: F.family, href: `${GOOGLE}Inter:wght@400;600;700;800` },
  {
    key: 'poppins',
    label: 'Poppins',
    stack: "Poppins, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    href: `${GOOGLE}Poppins:wght@400;600;700;800`,
  },
  {
    key: 'montserrat',
    label: 'Montserrat',
    stack: "Montserrat, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    href: `${GOOGLE}Montserrat:wght@400;600;700;800`,
  },
  {
    key: 'lato',
    label: 'Lato',
    stack: "Lato, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    href: `${GOOGLE}Lato:wght@400;700;900`,
  },
  {
    key: 'playfair',
    label: 'Playfair Display',
    stack: "'Playfair Display', Georgia, 'Times New Roman', serif",
    href: `${GOOGLE}Playfair+Display:wght@600;700;800`,
  },
  { key: 'helvetica', label: 'Helvetica / Arial', stack: 'Helvetica, Arial, sans-serif' },
  { key: 'georgia', label: 'Georgia', stack: "Georgia, 'Times New Roman', serif" },
];

const FONT_BY_KEY = new Map(CRM_EMAIL_FONTS.map((f) => [f.key, f]));

/** The pixel ranges each numeric setting accepts. */
export const CRM_EMAIL_RANGES = {
  base_font_size: { min: 13, max: 18 },
  content_padding: { min: 16, max: 48 },
  button_radius: { min: 0, max: 28 },
  panel_radius: { min: 0, max: 28 },
} as const;
export type CrmEmailRangeKey = keyof typeof CRM_EMAIL_RANGES;

export interface CrmEmailTheme {
  primary_color: string;
  accent_color: string;
  heading_color: string;
  text_color: string;
  muted_color: string;
  background_color: string;
  card_color: string;
  panel_color: string;
  border_color: string;
  body_font: string;
  heading_font: string;
  base_font_size: number;
  content_padding: number;
  button_radius: number;
  panel_radius: number;
  color_mode: CrmEmailColorMode;
  dark_background_color: string;
  dark_card_color: string;
  dark_heading_color: string;
  dark_text_color: string;
  dark_primary_color: string;
}

/** The light colour fields and the shared token each one replaces. */
export const LIGHT_COLOR_TOKENS = {
  primary_color: C.primary,
  accent_color: C.brand,
  heading_color: C.ink,
  text_color: C.body,
  muted_color: C.muted,
  background_color: C.canvas,
  card_color: C.surface,
  panel_color: C.panel,
  border_color: C.border,
} as const satisfies Partial<Record<keyof CrmEmailTheme, string>>;

/** The dark colour fields and the shared dark value each one replaces. */
export const DARK_COLOR_TOKENS = {
  dark_background_color: D.fill[C.canvas],
  dark_card_color: D.fill[C.surface],
  dark_heading_color: D.text[C.ink],
  dark_text_color: D.text[C.body],
  dark_primary_color: D.text[C.primary],
} as const satisfies Partial<Record<keyof CrmEmailTheme, string>>;

export type CrmEmailColorField = keyof typeof LIGHT_COLOR_TOKENS | keyof typeof DARK_COLOR_TOKENS;
export const CRM_EMAIL_COLOR_FIELDS = [
  ...Object.keys(LIGHT_COLOR_TOKENS),
  ...Object.keys(DARK_COLOR_TOKENS),
] as CrmEmailColorField[];

const px = (v: string): number => Number.parseInt(v, 10);

/** The theme every CRM email had before the setting existed: the shared tokens. */
export const CRM_EMAIL_THEME_DEFAULTS: CrmEmailTheme = {
  ...LIGHT_COLOR_TOKENS,
  ...DARK_COLOR_TOKENS,
  body_font: 'inter',
  heading_font: 'inter',
  base_font_size: px(F.body.size),
  content_padding: px(S.gutter),
  button_radius: px(S.buttonRadius),
  panel_radius: px(S.panelRadius),
  color_mode: 'AUTO',
};

/** `#rgb` / `#rrggbb` (any case) → `#rrggbb`, or null when it is not a colour. */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (/^#[\da-f]{6}$/.test(v)) return v;
  if (/^#[\da-f]{3}$/.test(v)) return `#${[...v.slice(1)].map((c) => c + c).join('')}`;
  return null;
}

export const fontFor = (key: string): CrmEmailFont => FONT_BY_KEY.get(key) ?? CRM_EMAIL_FONTS[0];
export const isFontKey = (key: unknown): key is string => typeof key === 'string' && FONT_BY_KEY.has(key);

/** A stored theme (possibly partial, from an older document) completed with the defaults. */
export function completeTheme(stored?: Partial<Record<keyof CrmEmailTheme, unknown>> | null): CrmEmailTheme {
  const out: CrmEmailTheme = { ...CRM_EMAIL_THEME_DEFAULTS };
  if (!stored) return out;
  for (const field of CRM_EMAIL_COLOR_FIELDS) {
    const hex = normalizeHex(stored[field]);
    if (hex) out[field] = hex;
  }
  if (isFontKey(stored.body_font)) out.body_font = stored.body_font;
  if (isFontKey(stored.heading_font)) out.heading_font = stored.heading_font;
  for (const key of Object.keys(CRM_EMAIL_RANGES) as CrmEmailRangeKey[]) {
    const n = stored[key];
    const { min, max } = CRM_EMAIL_RANGES[key];
    if (typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max) out[key] = n;
  }
  if (stored.color_mode === 'LIGHT' || stored.color_mode === 'AUTO') out.color_mode = stored.color_mode;
  return out;
}

const escapeRx = (s: string) => s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * Replace every listed hex in ONE pass, so a colour moved onto another token's
 * value is never moved a second time. Case-insensitive, and never inside a
 * longer hex (`#ffffff` does not match the start of `#ffffff80`).
 */
function remapHex(source: string, map: Record<string, string>, fillMap: Record<string, string> = {}): string {
  const keys = Object.keys(map).filter((k) => map[k] !== k);
  const fillKeys = Object.keys(fillMap).filter((k) => fillMap[k] !== k);
  if (keys.length === 0 && fillKeys.length === 0) return source;
  const parts: string[] = [];
  if (fillKeys.length) parts.push(`${FILL_CONTEXT}(?:${fillKeys.map(escapeRx).join('|')})`);
  if (keys.length) parts.push(`(?:${keys.map(escapeRx).join('|')})`);
  const rx = new RegExp(`(?:${parts.join('|')})(?![\\da-f])`, 'gi');
  return source.replace(rx, (hit) => {
    const key = hit.toLowerCase();
    return String(key in fillMap ? fillMap[key] : map[key]);
  });
}

/**
 * Where a colour is a FILL: `background:` / `background-color:` / `bgcolor=`.
 * The card's white is also the button label's white (`onPrimary`), so the card
 * colour is remapped only here — a dark card must not turn the button text dark.
 */
const FILL_CONTEXT = String.raw`(?<=(?:background(?:-color)?\s?[:=]\s?"?|bgcolor="?))`;

const DARK_QUERY = '@media (prefers-color-scheme: dark)';

/** Every `<style>…</style>` span that holds the dark-mode query, front to back. */
function darkStyleSpans(source: string): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  let cursor = 0;
  for (;;) {
    const at = source.indexOf(DARK_QUERY, cursor);
    if (at === -1) break;
    const start = source.lastIndexOf('<style', at);
    const close = source.indexOf('</style>', at);
    if (start === -1 || close === -1) break;
    const end = close + '</style>'.length;
    spans.push({ start, end });
    cursor = end;
  }
  return spans;
}

/** Map the light tokens everywhere, and the dark values too inside the dark stylesheet. */
function applyColors(source: string, theme: CrmEmailTheme): string {
  const light: Record<string, string> = {};
  for (const [field, token] of Object.entries(LIGHT_COLOR_TOKENS)) {
    if (field !== 'card_color') light[token] = theme[field as keyof typeof LIGHT_COLOR_TOKENS];
  }
  const fill = { [LIGHT_COLOR_TOKENS.card_color]: theme.card_color };
  const both: Record<string, string> = { ...light };
  for (const [field, token] of Object.entries(DARK_COLOR_TOKENS)) {
    both[token] = theme[field as keyof typeof DARK_COLOR_TOKENS];
  }
  let out = '';
  let cursor = 0;
  for (const span of darkStyleSpans(source)) {
    out += remapHex(source.slice(cursor, span.start), light, fill);
    out += remapHex(source.slice(span.start, span.end), both, fill);
    cursor = span.end;
  }
  return out + remapHex(source.slice(cursor), light, fill);
}

/** Drop the dark stylesheet and tell clients the email is light only. */
function lightOnly(source: string): string {
  let out = source;
  for (const span of darkStyleSpans(source).reverse()) {
    out = out.slice(0, span.start) + out.slice(span.end);
  }
  return out
    .replaceAll('content="light dark"', 'content="light"')
    .replaceAll('color-scheme: light dark; supported-color-schemes: light dark;', 'color-scheme: light; supported-color-schemes: light;');
}

/** The shared head's defaults for type, the button and the panels, set to the theme. */
function applyShapes(source: string, theme: CrmEmailTheme): string {
  const size = theme.base_font_size;
  return source
    .replaceAll(`font-family="${F.family}"`, `font-family="${fontFor(theme.body_font).stack}"`)
    .replaceAll(
      `font-size="${F.body.size}" line-height="${F.body.line}" padding="0"`,
      `font-size="${size}px" line-height="${Math.round(size * 1.6)}px" padding="0"`
    )
    .replaceAll(`border-radius="${S.buttonRadius}"`, `border-radius="${theme.button_radius}px"`)
    .replaceAll(`border-radius="${S.panelRadius}"`, `border-radius="${theme.panel_radius}px"`);
}

/** The `<mj-font>` and `<mj-style>` the theme adds to the head. */
function headExtras(theme: CrmEmailTheme): string {
  const fonts = [...new Set([theme.body_font, theme.heading_font])]
    .map(fontFor)
    .filter((f) => f.href)
    .map((f) => `    <mj-font name="${f.label}" href="${f.href}" />`);
  const heading = fontFor(theme.heading_font).stack;
  const gutter = `${theme.content_padding}px`;
  const style = [
    '    <mj-style>',
    `      h1, h2, h3 { font-family: ${heading} !important; }`,
    '      @media only screen and (min-width: 480px) {',
    `        .gutter > table > tbody > tr > td { padding-left: ${gutter} !important; padding-right: ${gutter} !important; }`,
    '      }',
    '    </mj-style>',
  ];
  return [...fonts, ...style].join('\n');
}

const sameAsDefaults = (theme: CrmEmailTheme): boolean =>
  (Object.keys(CRM_EMAIL_THEME_DEFAULTS) as (keyof CrmEmailTheme)[]).every(
    (k) => theme[k] === CRM_EMAIL_THEME_DEFAULTS[k]
  );

/**
 * Put the CRM theme on an email's MJML (already wrapped in its fragment).
 * A default theme leaves the source untouched.
 */
export function applyCrmEmailTheme(source: string, theme: CrmEmailTheme): string {
  if (sameAsDefaults(theme)) return source;
  let out = applyShapes(source, theme);
  out = applyColors(out, theme);
  if (theme.color_mode === 'LIGHT') out = lightOnly(out);
  const headEnd = out.indexOf('</mj-head>');
  if (headEnd === -1) return out;
  return `${out.slice(0, headEnd)}${headExtras(theme)}\n  ${out.slice(headEnd)}`;
}
