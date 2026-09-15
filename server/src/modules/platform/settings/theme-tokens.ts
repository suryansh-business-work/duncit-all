import { GraphQLError } from "graphql";

/**
 * Admin-managed colour tokens (Admin → Branding → Theme tokens) for mWeb and
 * the native app. The key list mirrors one mode of `@duncit/auth-tokens`
 * (`ModeColors`), which the server cannot import — the GraphQL input type is
 * what keeps a client from sending any other key.
 *
 * A stored blank means "keep the bundled value", so the apps only change the
 * tokens an admin actually filled in, and only while the source is SERVER.
 */
export const THEME_TOKEN_KEYS = [
  "bg",
  "surface",
  "soft",
  "ink",
  "muted",
  "border",
  "inputBorder",
  "primary",
  "primaryHover",
  "primaryActive",
  "onPrimary",
  "accent",
  "onAccent",
  "brand",
  "success",
  "warning",
  "error",
  "info",
  "onSemantic",
] as const;

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];
export type ThemeTokens = Record<ThemeTokenKey, string>;
export type ThemeTokensInput = Partial<Record<ThemeTokenKey, string | null>>;

/** LOCAL = the apps' bundled tokens; SERVER = the admin's values over them. */
export const THEME_TOKEN_SOURCES = new Set(["LOCAL", "SERVER"]);
export const DEFAULT_THEME_TOKEN_SOURCE = "LOCAL";

// #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(r,g,b) or rgba(r,g,b,a) — what both
// MUI and React Native accept as a colour string.
const COLOR =
  /^(?:#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\))$/i;

/** Every key present, blank where unset — the shape the `branding` query answers. */
export const themeTokensToPub = (stored?: Partial<ThemeTokens> | null): ThemeTokens =>
  Object.fromEntries(THEME_TOKEN_KEYS.map((key) => [key, stored?.[key] ?? ""])) as ThemeTokens;

/**
 * Trim every value and reject anything that is not a colour, naming the mode
 * and token so the admin can find the bad cell. Blank is allowed (bundled value).
 */
export function normalizeThemeTokens(input: ThemeTokensInput | null | undefined, mode: string): ThemeTokens {
  const tokens = themeTokensToPub(null);
  for (const key of THEME_TOKEN_KEYS) {
    const value = (input?.[key] ?? "").trim();
    if (value && !COLOR.test(value)) {
      throw new GraphQLError(`Theme token ${mode}.${key} is not a valid colour: "${value}"`, {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
    tokens[key] = value;
  }
  return tokens;
}
