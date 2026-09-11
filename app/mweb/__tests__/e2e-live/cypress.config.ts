import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'cypress';

// Windows resolves this to a backslash path; globs must stay POSIX.
const here = path.dirname(fileURLToPath(import.meta.url)).replaceAll('\\', '/');

/**
 * Cypress E2E for the mWeb app against a REAL server.
 *
 * Unlike `__tests__/e2e`, nothing here stubs GraphQL. The build under test is
 * `pnpm build:e2e:live`, which points the bundle at the staging API, and every
 * spec signs in or signs up as the run's own identity (Tech > E2E Tests >
 * Settings), creates real pods, tickets and ideas, and leaves the purge at the
 * end of the CI leg to remove them. That server is ALWAYS staging: the suite
 * needs "Return one-time codes" switched on there, which must never be on for
 * production.
 *
 * Specs are numbered because they run in this order on purpose — the signup
 * spec creates the account the onboarding and password-recovery scenarios
 * then use, since one WhatsApp number can only sign up once per run.
 *
 * The recording is per spec; the scenario CLIPS the Slack thread shows are cut
 * from it afterwards using the marks recorded below. Cypress 13 stopped saying
 * where in the video each test began, so the support file sends a `cy.task`
 * at the start and the end of every test, and `after:spec` writes them beside
 * the video as `<video>.scenarios.json` for scripts/e2e-videos.mjs to read.
 */

interface ScenarioMark {
  title: string;
  state: string;
  start_ms: number;
  end_ms: number | null;
}

/** When each spec's recording began, and where every scenario sits inside it. */
function scenarioClock() {
  const startedAt = new Map<string, number>();
  const marks = new Map<string, ScenarioMark[]>();
  const list = (spec: string) => {
    const existing = marks.get(spec);
    if (existing) return existing;
    const fresh: ScenarioMark[] = [];
    marks.set(spec, fresh);
    return fresh;
  };
  return {
    begin(spec: string) {
      startedAt.set(spec, Date.now());
      marks.set(spec, []);
    },
    start(spec: string, title: string) {
      const t0 = startedAt.get(spec) ?? Date.now();
      list(spec).push({ title, state: '', start_ms: Date.now() - t0, end_ms: null });
    },
    end(spec: string, title: string, state: string) {
      const t0 = startedAt.get(spec) ?? Date.now();
      const open = list(spec).findLast((mark) => mark.title === title && mark.end_ms === null);
      if (!open) return;
      open.end_ms = Date.now() - t0;
      open.state = state;
    },
    finished(spec: string) {
      return list(spec).filter((mark) => mark.end_ms !== null);
    },
  };
}

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:2003',
    specPattern: `${here}/specs/**/*.cy.{ts,tsx}`,
    supportFile: `${here}/support/e2e.ts`,
    fixturesFolder: false,
    screenshotsFolder: `${here}/../../cypress-artifacts/screenshots`,
    videosFolder: `${here}/../../cypress-artifacts/videos`,
    downloadsFolder: `${here}/../../cypress-artifacts/downloads`,
    screenshotOnRunFailure: true,
    viewportWidth: 412,
    viewportHeight: 915,
    // A real server answers in its own time, and the content screening before
    // a pod publishes asks an AI model — twice the mocked suite's budget.
    defaultCommandTimeout: 15000,
    // Never. A retried scenario would create its record twice on a real
    // server, and a flaky pass is worse than a red one here.
    retries: 0,
    env: {
      // The API the bundle under test talks to; `cy.request` uses the same one.
      // Overridable with CYPRESS_GRAPHQL_URL, which Cypress maps to this key.
      GRAPHQL_URL: process.env.CYPRESS_GRAPHQL_URL || 'https://staging.server.duncit.com/graphql',
      COVER_IMAGE: `${here}/fixtures/cover.jpg`,
    },
    setupNodeEvents(on) {
      const clock = scenarioClock();
      on('before:spec', (spec) => clock.begin(spec.absolute));
      on('task', {
        'scenario:start'({ spec, title }: { spec: string; title: string }) {
          clock.start(spec, title);
          return null;
        },
        'scenario:end'({ spec, title, state }: { spec: string; title: string; state: string }) {
          clock.end(spec, title, state);
          return null;
        },
      });
      on('after:spec', (spec, results) => {
        if (!results.video) return;
        const sidecar = {
          spec: spec.relative,
          video: results.video,
          scenarios: clock.finished(spec.absolute),
        };
        fs.writeFileSync(`${results.video}.scenarios.json`, `${JSON.stringify(sidecar, null, 2)}\n`);
      });
    },
  },
});
