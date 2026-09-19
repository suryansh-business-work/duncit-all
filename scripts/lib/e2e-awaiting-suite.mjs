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
 * in the same commit that gives it a suite again. Consoles that shipped after
 * the removal (communications, logs, analytics) wait here for their first one.
 */
export const AWAITING_SUITE = new Set([
  'admin',
  'ads-portal',
  'ai',
  'analytics',
  'ecomm-portal',
  'ecomm-store',
  // Duncit Lite (web app + console in one workspace), shipped after the removal.
  'duncit-lite',
  'challenge-portal',
  'club-admins',
  'communications',
  'clubs',
  'crm',
  'developers-portal',
  'employee',
  'finance',
  'hosts',
  'hr',
  'legal',
  'localization',
  'logs-portal',
  'marketing',
  'onboarding',
  'pods',
  'products',
  'regional-club-admin',
  'tech',
  'venues',
  'website-app',
]);
