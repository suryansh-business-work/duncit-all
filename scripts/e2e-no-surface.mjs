#!/usr/bin/env node
/**
 * The honest no-op for the `e2e` script of a workspace that has no browser
 * surface to drive end-to-end.
 *
 * Every workspace ships an `e2e` script so CI can run it WITHOUT `--if-present`
 * — a missing script must fail the build rather than be silently skipped, which
 * is the whole point of the e2e gate. That only works if the no-ops are
 * explicit, so this script refuses to succeed for a workspace that is not on
 * the allowlist below: a portal or app can never quietly opt out of its suite.
 *
 * Usage:  node ../../scripts/e2e-no-surface.mjs <workspace-name>
 */

/**
 * name -> why a no-op is honest here.
 * Anything NOT listed must run a real Cypress suite.
 */
const NO_E2E_SURFACE = new Map([
  // --- shared libraries: no app, no routes, no server. Their behaviour is
  // covered by their own vitest suites (packages coverage thresholds, enforced
  // by shared-gates.yml) and exercised end-to-end through the 17 portals + mWeb
  // that consume them.
  ['@duncit/ad-request-form', 'library — rendered end-to-end by ads-portal + partners-app'],
  ['@duncit/app-settings', 'library — rendered end-to-end by every portal shell'],
  ['@duncit/auth-tokens', 'zero-dep token helpers, no DOM'],
  ['@duncit/availability-calendar', 'library — rendered end-to-end by admin + partners-app'],
  ['@duncit/breadcrumb', 'library — rendered end-to-end by the portal shell'],
  ['@duncit/category', 'library — rendered end-to-end by admin + mWeb'],
  ['@duncit/club-form', 'library — rendered end-to-end by admin + partners-app'],
  ['@duncit/datetime', 'pure date/time helpers, no DOM'],
  ['@duncit/dialogs', 'library — rendered end-to-end by every portal'],
  ['@duncit/fallback-icons', 'static asset manifest; verified by scripts/verify-fallback-icons.mjs'],
  ['@duncit/forms', 'library — rendered end-to-end by every portal form'],
  ['@duncit/geo', 'pure geo helpers, no DOM'],
  ['@duncit/gql-types', 'generated types only, no runtime'],
  ['@duncit/i18n', 'string bundles; verified by scripts/verify-translation-keys.mjs'],
  ['@duncit/location', 'library — rendered end-to-end by mWeb + admin'],
  ['@duncit/logs', 'transport library, no DOM'],
  ['@duncit/media-picker', 'library — rendered end-to-end by admin + support'],
  ['@duncit/pod-form', 'library — rendered end-to-end by mWeb'],
  ['@duncit/portal-pod-form', 'library — rendered end-to-end by admin + challenge-portal'],
  ['@duncit/regex', 'zero-dep regex/validators, no DOM'],
  ['@duncit/shell', 'library — rendered end-to-end by all 17 portal suites'],
  ['@duncit/slack', 'zero-dep payload builders, no DOM'],
  ['@duncit/table', 'library — rendered end-to-end by every portal list page'],
  ['@duncit/theme', 'library — rendered end-to-end by every portal'],
  ['@duncit/ui', 'library — rendered end-to-end by every portal'],
  ['@duncit/user-context', 'library — its LoginScreen is what every portal login spec drives'],
  ['@duncit/utils', 'zero-dep browser utils, no DOM'],

  // --- the Astro marketing sites are static, prerendered HTML with no app
  // state, no auth and no GraphQL. They are covered by their own vitest suites
  // plus the `astro build` gate in websites-ci.yml.
  ['duncit.com', 'static Astro site — no app state to drive'],
  ['partners-website', 'static Astro site — no app state to drive'],
  ['ads-website', 'static Astro site — no app state to drive'],
  ['status', 'static Astro site — no app state to drive'],
  ['earnwith-website', 'static Astro site — no app state to drive'],
  ['duncit-docs', 'static docs site — no app state to drive'],

  // --- the API. Its contract is exercised by every portal/mWeb suite through
  // the stubbed GraphQL layer, and directly by its own jest integration tests.
  ['server', 'GraphQL API — no browser surface; covered by its own jest suites'],
]);

const name = process.argv[2];

if (!name) {
  console.error('e2e-no-surface: expected a workspace name argument.');
  process.exit(1);
}

const reason = NO_E2E_SURFACE.get(name);

if (!reason) {
  console.error(
    `e2e-no-surface: "${name}" is not on the no-e2e-surface allowlist.\n` +
      'Every portal and app must run a real Cypress suite from its `e2e` script.\n' +
      'If this workspace genuinely has no browser surface, add it (with a reason) to\n' +
      'scripts/e2e-no-surface.mjs — deliberately, in review.',
  );
  process.exit(1);
}

console.log(`e2e: no end-to-end surface for ${name} — ${reason}.`);
