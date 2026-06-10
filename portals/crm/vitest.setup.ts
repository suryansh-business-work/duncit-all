import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library leaks DOM between tests in vitest's worker — clean
// up the container after every test so queries can't accidentally match a
// previous render's nodes.
afterEach(() => {
  cleanup();
});
