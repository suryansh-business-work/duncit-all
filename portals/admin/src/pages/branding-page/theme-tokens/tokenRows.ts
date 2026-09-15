import { light, type ModeColors } from '@duncit/auth-tokens';
import { AA_TEXT, contrastRatio, mix, textOn, tokens } from '@duncit/theme';

/** One colour token of a mode — the same 19 keys as `@duncit/auth-tokens`' `ModeColors`. */
export type TokenKey = keyof ModeColors;
/** What the admin typed per token; blank keeps the bundled (local) value. */
export type ThemeTokenValues = Record<TokenKey, string>;
export type ThemeTokenSourceValue = 'LOCAL' | 'SERVER';

/** WCAG 1.4.11 — a form field's outline against the ground it sits on. */
const AA_NON_TEXT = 3;
const TEXT_GROUNDS: readonly TokenKey[] = ['bg', 'surface', 'soft'];
/** How much darker the hover and pressed steps are than a new primary colour. */
const HOVER_STEP = 0.1;
const ACTIVE_STEP = 0.2;

const HEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
// The same colour strings the server accepts: #rgb(a), #rrggbb(aa), rgb() or rgba().
const CSS_COLOR =
  /^(?:#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\))$/i;

interface TokenSpec {
  /** Localization key of the "what it colours" hint. */
  hintKey: string;
  /** The tokens this one must stay readable against; the worst of them is shown. */
  against?: readonly TokenKey[];
  /** Minimum ratio against `against` — AA text unless stated. */
  min?: number;
}

export interface TokenRow extends TokenSpec {
  key: TokenKey;
}

// A Record so a token added to ModeColors fails typecheck until it has a row here.
const SPECS: Record<TokenKey, TokenSpec> = {
  bg: { hintKey: 'admin.branding.tokenHints.bg', against: ['ink'] },
  surface: { hintKey: 'admin.branding.tokenHints.surface', against: ['ink'] },
  soft: { hintKey: 'admin.branding.tokenHints.soft', against: ['ink'] },
  ink: { hintKey: 'admin.branding.tokenHints.ink', against: TEXT_GROUNDS },
  muted: { hintKey: 'admin.branding.tokenHints.muted', against: TEXT_GROUNDS },
  border: { hintKey: 'admin.branding.tokenHints.border' },
  inputBorder: { hintKey: 'admin.branding.tokenHints.inputBorder', against: TEXT_GROUNDS, min: AA_NON_TEXT },
  primary: { hintKey: 'admin.branding.tokenHints.primary', against: ['onPrimary'] },
  primaryHover: { hintKey: 'admin.branding.tokenHints.primaryHover', against: ['onPrimary'] },
  primaryActive: { hintKey: 'admin.branding.tokenHints.primaryActive', against: ['onPrimary'] },
  onPrimary: { hintKey: 'admin.branding.tokenHints.onPrimary', against: ['primary'] },
  accent: { hintKey: 'admin.branding.tokenHints.accent', against: TEXT_GROUNDS },
  onAccent: { hintKey: 'admin.branding.tokenHints.onAccent', against: ['accent'] },
  brand: { hintKey: 'admin.branding.tokenHints.brand' },
  success: { hintKey: 'admin.branding.tokenHints.success', against: TEXT_GROUNDS },
  warning: { hintKey: 'admin.branding.tokenHints.warning', against: TEXT_GROUNDS },
  error: { hintKey: 'admin.branding.tokenHints.error', against: TEXT_GROUNDS },
  info: { hintKey: 'admin.branding.tokenHints.info', against: TEXT_GROUNDS },
  onSemantic: { hintKey: 'admin.branding.tokenHints.onSemantic', against: ['success', 'warning', 'error', 'info'] },
};

export const TOKEN_ROWS: readonly TokenRow[] = (Object.keys(SPECS) as TokenKey[]).map((key) => ({
  key,
  ...SPECS[key],
}));

const TOKEN_KEYS = TOKEN_ROWS.map((row) => row.key);

/** Every token blank — "keep every bundled value". */
export const emptyThemeTokens = (): ThemeTokenValues =>
  Object.fromEntries(TOKEN_KEYS.map((key) => [key, ''])) as ThemeTokenValues;

/** The query's token object as mutation input: only the 19 keys, no `__typename`. */
export const toThemeTokensInput = (stored: Partial<ThemeTokenValues> | null | undefined): ThemeTokenValues =>
  Object.fromEntries(TOKEN_KEYS.map((key) => [key, stored?.[key] ?? ''])) as ThemeTokenValues;

/** Blank or a colour the server will accept. */
export const isTokenValueValid = (value: string): boolean => !value.trim() || CSS_COLOR.test(value.trim());

/** The value the apps will paint: the admin's, else the bundled one. */
export const effectiveToken = (values: ThemeTokenValues, local: ModeColors, key: TokenKey): string =>
  values[key].trim() || local[key];

export interface TokenContrast {
  ratio: number;
  pair: TokenKey;
  min: number;
  pass: boolean;
}

/** The worst contrast of a token against the tokens it sits on/under; null when not measurable (rgba). */
export function tokenContrast(values: ThemeTokenValues, local: ModeColors, row: TokenRow): TokenContrast | null {
  const color = effectiveToken(values, local, row.key);
  if (!row.against || !HEX.test(color)) return null;
  const min = row.min ?? AA_TEXT;
  let worst: TokenContrast | null = null;
  for (const pair of row.against) {
    const other = effectiveToken(values, local, pair);
    if (!HEX.test(other)) continue;
    const ratio = contrastRatio(color, other);
    if (!worst || ratio < worst.ratio) worst = { ratio, pair, min, pass: ratio >= min };
  }
  return worst;
}

/**
 * The primary colour and the steps that must move with it: a hover and pressed
 * fill that are darker, and the label colour that stays readable on it. A
 * half-typed colour only sets `primary` — the table flags it as invalid.
 */
export function primaryTokens(color: string): Partial<ThemeTokenValues> {
  if (!HEX.test(color)) return { primary: color };
  return {
    primary: color,
    primaryHover: mix(color, tokens.common.black, HOVER_STEP),
    primaryActive: mix(color, tokens.common.black, ACTIVE_STEP),
    onPrimary: textOn(color, light.ink),
  };
}
