/**
 * The browser jsdom does not have.
 *
 * Everything AG Grid reaches for lives with the table package, because that is
 * what brings AG Grid in — see `@duncit/table/test-setup` for what each gap is
 * and which call found it.
 */
import '@duncit/table/test-setup';
import { configure } from '@testing-library/react';

// findBy* and waitFor give up after 1 s by default; under the coverage run on CI a
// dialog closing or a table settling takes longer. Still bounded, just not 1 s.
configure({ asyncUtilTimeout: 5000 });
