import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// With `globals: false` the `/vitest` auto-register entry does not reliably
// extend Vitest's `expect`, so wire the matchers on explicitly.
expect.extend(matchers);

// RTL auto-cleanup relies on a global afterEach, which `globals: false` omits —
// register it explicitly so DOM state never leaks between tests.
afterEach(() => {
  cleanup();
});
