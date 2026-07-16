import { afterEach, expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

// Extend explicitly (repo convention) so the matchers re-register per test file —
// the bare `@testing-library/jest-dom/vitest` import only auto-extends once and is
// lost across files that share a worker.
expect.extend(matchers);

// RTL auto-cleanup relies on a global afterEach, which `globals: false` omits —
// register it explicitly so DOM state never leaks between tests.
afterEach(() => {
  cleanup();
});
