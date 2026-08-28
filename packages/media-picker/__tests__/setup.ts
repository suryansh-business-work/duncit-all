import { afterEach, expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// The jsdom gaps every media suite reaches for: the cropper observes its own
// box, and a picked file is previewed through an object URL. jsdom provides
// neither, and throws rather than returning undefined — which kills the suite
// before a single assertion runs. Shared here rather than pasted per file.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
globalThis.URL.createObjectURL ??= () => 'blob:preview';
globalThis.URL.revokeObjectURL ??= () => undefined;
