import { defineConfig } from 'vitest/config';

/** The coupon form schema is the only thing here with logic of its own; the
 * table and the dialog are rendered end-to-end by the two portals that consume
 * them. `*.form.cy.ts` is the repo-wide name for a form spec (rule 10), which
 * vitest's default include pattern does not match. */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.form.cy.{ts,tsx}'],
  },
});
