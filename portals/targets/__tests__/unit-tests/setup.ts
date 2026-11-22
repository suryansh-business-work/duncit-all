// The table package's shared jsdom gaps (ResizeObserver, elementFromPoint),
// imported by path: '@duncit/table' is aliased to a stub in this workspace.
import '../../../../packages/table/src/test-setup';
// Types for the jest-dom matchers; they are registered explicitly below, as in
// the other consoles, because the auto-extend is unreliable under this config.
import '@testing-library/jest-dom/vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import { resetCharts } from '../mocks/charts';
import { resetTableControls } from '../mocks/table';

expect.extend(matchers);

afterEach(() => {
  cleanup();
  resetCharts();
  resetTableControls();
  localStorage.clear();
});

// jsdom has no matchMedia; the theme and useMediaQuery read it.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
