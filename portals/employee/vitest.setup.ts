import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// Repo-proven pattern: the '@testing-library/jest-dom/vitest' side-effect
// auto-extend is unreliable under this workspace's hoisting, so register the
// matchers explicitly and clean the DOM between tests.
expect.extend(matchers);
afterEach(() => {
  cleanup();
});
