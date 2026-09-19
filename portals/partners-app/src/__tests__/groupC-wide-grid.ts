/**
 * A wider jsdom viewport, for grids whose trailing columns matter.
 *
 * `__tests__/helpers/agGridEnv` gives every element an 800px box. AG Grid
 * virtualises columns, so on a grid wider than that the last columns — the
 * row actions, the AI-monitoring pill, the verified chip — are never mounted
 * and nothing in them can be pressed. Import this AFTER agGridEnv, in the
 * suites that need those columns; vitest isolates each file, so the wider box
 * stays local to it.
 */
const WIDE_VIEWPORT_PX = 2400;

for (const property of ['offsetWidth', 'clientWidth'] as const) {
  Object.defineProperty(globalThis.HTMLElement.prototype, property, {
    configurable: true,
    get: () => WIDE_VIEWPORT_PX,
  });
}

export {};
