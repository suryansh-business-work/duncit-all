import '@duncit/table/test-setup';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// findBy*/waitFor give up after 1 s by default. Under v8 coverage on CI's two-core runner a
// whole-form re-render regularly takes longer, so a different suite missed its wait on each
// run (2026-11-24: assignee-field, lead-quality-settings-page, venue-lead-editor-page). Only a
// wait that is going to fail anyway takes longer; nothing passes that would not otherwise.
configure({ asyncUtilTimeout: 5000 });

// React Testing Library leaks DOM between tests in vitest's worker — clean
// up the container after every test so queries can't accidentally match a
// previous render's nodes.
afterEach(() => {
  cleanup();
});
