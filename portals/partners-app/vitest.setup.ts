/**
 * The browser jsdom does not have.
 *
 * Everything AG Grid reaches for lives with the table package, because that is
 * what brings AG Grid in — see `@duncit/table/test-setup` for what each gap is
 * and which call found it.
 */
import '@duncit/table/test-setup';
