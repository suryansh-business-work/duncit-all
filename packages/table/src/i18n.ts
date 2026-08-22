import {
  createTranslator,
  flattenCatalogue,
  SHELL_BUNDLE,
  useTranslation as useSharedTranslation,
  type Translator,
} from '@duncit/app-settings';

/**
 * The table's LOCAL FALLBACK bundle (CLAUDE.md rule 38).
 *
 * Its copy lives under `shell.table.*` in @duncit/i18n with every other
 * surface's, and is compiled into whichever portal build imports this package —
 * which is what renders offline and before the API answers. Every portal mounts
 * the shell's bundle already, so this only matters when a grid is rendered with
 * no LocaleProvider above it (a test, an error boundary).
 */
export const TABLE_FALLBACK_FLAT = flattenCatalogue(SHELL_BUNDLE);

/** The `t` a table component receives. */
export type Translate = Translator['t'];

/** Translate inside the grid — the same @duncit/i18n core the portals use. */
export function useTranslation() {
  return useSharedTranslation(TABLE_FALLBACK_FLAT);
}

/**
 * A provider-free translator over the bundled copy.
 *
 * A column's `valueGetter` runs outside the React tree — AG Grid calls it while
 * sorting and while writing a CSV — so it cannot read the provider. The twin of
 * @duncit/shell's and mWeb's `fallbackT`, and used for exactly that: text that
 * has to exist before there is a component to ask.
 */
export const fallbackT: Translate = createTranslator({
  locale: 'en-IN',
  fallback: TABLE_FALLBACK_FLAT,
}).t;
