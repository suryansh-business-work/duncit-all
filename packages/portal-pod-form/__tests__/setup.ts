import '@testing-library/jest-dom/vitest';
import { afterEach, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// In this monorepo's pnpm layout, `@testing-library/jest-dom/vitest`'s internal
// `expect` import resolves through pnpm's shared hoist layer, which pins an
// older `vitest` than the one this package's test files use — so the import
// above extends the wrong `expect` instance. Re-extend explicitly against the
// `expect` this package actually resolves, so the jest-dom matchers work.
expect.extend(matchers);

afterEach(() => {
  cleanup();
});
