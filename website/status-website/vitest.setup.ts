import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Explicit tests import their own globals (no `globals: true`), so Testing
// Library's automatic afterEach cleanup is not registered — do it here so each
// test starts from a clean DOM.
afterEach(() => {
  cleanup();
});
