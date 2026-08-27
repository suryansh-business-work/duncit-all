/**
 * The translator a schema factory takes.
 *
 * Typed locally rather than imported from `@duncit/i18n` so this subpath stays
 * dependency-free: the native app, mWeb and the portals each resolve `t`
 * through their own provider, and all three satisfy this signature.
 *
 * Every schema here is a FACTORY rather than a constant because Zod schemas are
 * built outside React — the form that renders passes its own live `t`, so one
 * set of rules follows whichever language the surface resolved (rule 38). Each
 * surface binds the factories once against its own bundled-English fallback and
 * re-exports the bound schema under the name its call sites already use.
 */
export type Translate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;
