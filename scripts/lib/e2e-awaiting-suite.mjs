/**
 * Browser workspaces whose Cypress suite was removed on 2026-09-14 and is being
 * rebuilt batch by batch (Batch 1: signup, sign-in, forgot password, profile
 * update, change/create password, account delete — live, per the Tech > E2E
 * Tests settings).
 *
 * Until a workspace's new suite lands, its `e2e` script is the no-op in
 * scripts/e2e-no-surface.mjs. Listing it here is what makes that honest: the
 * audit (scripts/verify-e2e-scripts.mjs) still refuses a portal or app that
 * runs neither Cypress nor an entry on this list. A workspace leaves this list
 * in the same commit that gives it a suite again.
 */
export const AWAITING_SUITE = new Set([
  'admin',
  'ads-portal',
  'ai',
  'challenge-portal',
  'club-admins',
  'clubs',
  'crm',
  'developers-portal',
  'employee',
  'finance',
  'hosts',
  'hr',
  'legal',
  'marketing',
  'onboarding',
  'pods',
  'products',
  'regional-club-admin',
  'tech',
  'venues',
  'website-app',
]);
