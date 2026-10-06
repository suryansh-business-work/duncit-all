/**
 * A Website CMS site's design system as CSS — written ONCE and used by both
 * sides: the website renderer (`website/cms-site`) puts it on the live page,
 * the Website portal paints it into the GrapesJS canvas and the previews.
 * Framework-free and dependency-free, so either side can import it.
 *
 * Inputs are validated by the API (token values carry no `;{}<>`, font
 * families are letters/digits/spaces/hyphens), so nothing here can break out
 * of the rule it is written into.
 */

export interface CmsDesignToken {
  name: string;
  value: string;
}

export interface CmsDesignFontFile {
  weight: number;
  style: string;
  url: string;
}

export interface CmsDesignFont {
  family: string;
  source: 'GOOGLE' | 'CUSTOM';
  weights: number[];
  italic: boolean;
  role: 'HEADING' | 'BODY' | 'ACCENT' | 'NONE';
  variable: string;
  fallback: string;
  files: CmsDesignFontFile[];
}

/** Every token as a custom property on :root — `var(--color-primary)` everywhere. */
export function tokensCss(tokens: readonly CmsDesignToken[]): string {
  if (!tokens.length) return '';
  const declarations = tokens.map((token) => `${token.name}:${token.value};`).join('');
  return `:root{${declarations}}`;
}

const ROLE_VARIABLE: Record<CmsDesignFont['role'], string> = {
  HEADING: '--font-heading',
  BODY: '--font-body',
  ACCENT: '--font-accent',
  NONE: '',
};

/** `Plus Jakarta Sans` in 400/700 + italics → `family=Plus+Jakarta+Sans:ital,wght@0,400;0,700;1,400;1,700`. */
function googleFamily(font: CmsDesignFont): string {
  const name = font.family.trim().replaceAll(' ', '+');
  const weights = [...new Set(font.weights)].sort((a, b) => a - b);
  if (!font.italic) return `family=${name}:wght@${weights.join(';')}`;
  const axes = [...weights.map((w) => `0,${w}`), ...weights.map((w) => `1,${w}`)];
  return `family=${name}:ital,wght@${axes.join(';')}`;
}

/** ONE Google Fonts stylesheet for every Google family, in only the chosen weights. */
export function googleFontsHref(fonts: readonly CmsDesignFont[]): string | null {
  const google = fonts.filter((font) => font.source === 'GOOGLE' && font.weights.length > 0);
  if (!google.length) return null;
  return `https://fonts.googleapis.com/css2?${google.map(googleFamily).join('&')}&display=swap`;
}

const FORMAT: Record<string, string> = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };

const formatOf = (url: string) => {
  const path = url.split('?')[0];
  return FORMAT[path.slice(path.lastIndexOf('.') + 1).toLowerCase()] ?? 'woff2';
};

/** A family as a css value: quoted name, then its fallback stack. */
export const fontStack = (font: Pick<CmsDesignFont, 'family' | 'fallback'>) => [JSON.stringify(font.family), font.fallback || 'sans-serif'].join(', ');

/** @font-face for every uploaded file, and the role variables pages style with. */
export function fontCss(fonts: readonly CmsDesignFont[]): string {
  const faces = fonts
    .filter((font) => font.source === 'CUSTOM')
    .flatMap((font) =>
      font.files.map(
        (file) =>
          `@font-face{font-family:"${font.family}";src:url("${file.url}") format("${formatOf(file.url)}");` +
          `font-weight:${file.weight};font-style:${file.style};font-display:swap}`
      )
    );
  const variables = fontVariables(fonts).map(({ name, value }) => `${name}:${value};`);
  return [...faces, variables.length ? `:root{${variables.join('')}}` : ''].join('');
}

/** The variables a site's fonts declare: each role's (--font-heading…) and any extra token a font is bound to. */
function fontVariables(fonts: readonly CmsDesignFont[]): { name: string; value: string }[] {
  return fonts.flatMap((font) => [ROLE_VARIABLE[font.role], font.variable].filter(Boolean).map((name) => ({ name, value: fontStack(font) })));
}

/**
 * Every CSS variable a site's design system declares, as name and value: its
 * tokens, then its font variables (which win, as in the stylesheet). What the
 * Website portal lists beside a stylesheet as the variables code can use.
 */
export function designVariables(tokens: readonly CmsDesignToken[], fonts: readonly CmsDesignFont[]): { name: string; value: string }[] {
  const byName = new Map<string, string>();
  for (const token of tokens) byName.set(token.name, token.value);
  for (const variable of fontVariables(fonts)) byName.set(variable.name, variable.value);
  return [...byName].map(([name, value]) => ({ name, value }));
}
