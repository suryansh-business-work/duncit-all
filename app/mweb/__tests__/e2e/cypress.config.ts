import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'cypress';
import { registerScenarioClips } from '../../../../scripts/lib/cypress-scenarios.mjs';

// Windows resolves this to a backslash path; globs must stay POSIX.
const here = path.dirname(fileURLToPath(import.meta.url)).replaceAll('\\', '/');

/**
 * mWeb account lifecycle, support and pod ideas, live on staging (E2E Batches 1 + 2).
 *
 * Nothing on the server is stubbed. The bundle under test is built with
 * VITE_GRAPHQL_URL set to staging, and the specs under `specs/` run IN FILE
 * ORDER as one account's life: 01 signup creates the run account, 02–05 sign
 * in, recover the password, edit the profile and change the password, 06 and
 * 07 file support requests and a pod idea for the staff-portal specs to follow,
 * 08 deletes the account, and 09 joins and signs in again with Google as a
 * second account on the same number. One-time codes come from the OTP testing
 * API (`e2eOneTimeCode`), never from the screen; Google's popup is the one
 * thing stood in for (support/google-stand-in.ts). The run's identity arrives
 * as CYPRESS_E2E_* from the workflow (Tech > E2E Tests > Settings).
 */
export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:2003',
    specPattern: `${here}/specs/**/*.cy.{ts,tsx}`,
    supportFile: `${here}/support/e2e.ts`,
    fixturesFolder: `${here}/fixtures`,
    screenshotsFolder: `${here}/../../cypress-artifacts/screenshots`,
    videosFolder: `${here}/../../cypress-artifacts/videos`,
    downloadsFolder: `${here}/../../cypress-artifacts/downloads`,
    screenshotOnRunFailure: true,
    // The CI job runs this project three times (01–07, then 08 after the
    // Partners and staff-portal specs, then 09); keeping assets keeps every
    // run's videos and failures.
    trashAssetsBeforeRuns: false,
    viewportWidth: 412,
    viewportHeight: 915,
    // A real server answers in its own time.
    defaultCommandTimeout: 15000,
    // Never: a retried scenario would repeat a real signup or a real code
    // request, and a flaky pass is worse than a red one here.
    retries: 0,
    env: {
      GRAPHQL_URL: process.env.CYPRESS_GRAPHQL_URL || 'https://staging.server.duncit.com/graphql',
      // The Finance portal, where specs/10-pod-payout.cy.ts approves the payment release.
      FINANCE_URL: process.env.CYPRESS_FINANCE_URL || 'http://localhost:2008',
      // The public websites and the pet store (specs/ui/websites/), each served on
      // its own port from a build pointed at staging (see the workflow notes).
      MAIN_SITE_URL: process.env.CYPRESS_MAIN_SITE_URL || 'http://localhost:2000',
      ADS_SITE_URL: process.env.CYPRESS_ADS_SITE_URL || 'http://localhost:2020',
      EARNWITH_SITE_URL: process.env.CYPRESS_EARNWITH_SITE_URL || 'http://localhost:2025',
      PARTNERS_SITE_URL: process.env.CYPRESS_PARTNERS_SITE_URL || 'http://localhost:2004',
      STATUS_SITE_URL: process.env.CYPRESS_STATUS_SITE_URL || 'http://localhost:2019',
      ECOMM_STORE_URL: process.env.CYPRESS_ECOMM_STORE_URL || 'http://localhost:2039',
      CMS_SITE_URL: process.env.CYPRESS_CMS_SITE_URL || 'http://localhost:2043',
      // A hostname a staging CMS site answers on (Website portal > Sites > domains).
      // Left blank, the cms-site spec's published-site scenarios fail in before() and say so.
      CMS_SITE_HOST: process.env.CYPRESS_CMS_SITE_HOST || '',
      // The public addresses those builds bake into links and canonicals
      // (PUBLIC_*_URL / VITE_*_URL) — staging's, as deploy.yml sets them.
      LINK_MAIN_SITE_URL: process.env.CYPRESS_LINK_MAIN_SITE_URL || 'https://staging.duncit.com',
      LINK_MWEB_URL: process.env.CYPRESS_LINK_MWEB_URL || 'https://staging.mweb.duncit.com',
      LINK_ADS_SITE_URL: process.env.CYPRESS_LINK_ADS_SITE_URL || 'https://staging.ads.duncit.com',
      LINK_ADS_PORTAL_URL: process.env.CYPRESS_LINK_ADS_PORTAL_URL || 'https://staging.ads-portal.duncit.com',
      LINK_EARNWITH_URL: process.env.CYPRESS_LINK_EARNWITH_URL || 'https://staging.earnwith.duncit.com',
      LINK_PARTNERS_SITE_URL: process.env.CYPRESS_LINK_PARTNERS_SITE_URL || 'https://staging.partners.duncit.com',
      LINK_PARTNERS_APP_URL: process.env.CYPRESS_LINK_PARTNERS_APP_URL || 'https://staging.partners-app.duncit.com',
    },
    setupNodeEvents(on) {
      registerScenarioClips(on);
      // Visiting another origin (the Finance portal in specs/10) reloads the spec and
      // runs its `before` again; a journey keeps what it has made here, across that.
      const kept = new Map<string, unknown>();
      on('task', {
        'journey:keep'({ key, value }: { key: string; value: unknown }) {
          kept.set(key, value);
          return null;
        },
        'journey:read'(key: string) {
          return kept.get(key) ?? null;
        },
      });
    },
  },
});
