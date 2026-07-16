import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// The '@testing-library/jest-dom/vitest' auto-extend does not work in this
// repo's vitest setup, so extend the matchers explicitly (repo-proven pattern).
expect.extend(matchers);

afterEach(() => {
  cleanup();
});
