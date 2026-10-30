import fs from 'node:fs';
import path from 'node:path';

/**
 * Where each scenario sits inside a spec's recording, for the per-scenario
 * clips the E2E Slack thread shows (scripts/e2e-videos.mjs stitch mode), and
 * how every scenario ended, for the scenario list on the Tests console.
 *
 * Cypress 13 stopped reporting where in the video each test began, so a
 * suite's support file sends `scenario:start` / `scenario:end` tasks around
 * every test, and `after:spec` writes the marks beside the video as
 * `<video>.scenarios.json`. Shared by every live Cypress project (mWeb, native
 * web, Partners) so the sidecar has one shape.
 *
 * Plain ESM with no imports beyond node: a Cypress config in any workspace can
 * load it by relative path, whichever package manager installed that
 * workspace's Cypress.
 */
export function registerScenarioClips(on, config) {
  const startedAt = new Map();
  const marks = new Map();
  const list = (spec) => {
    if (!marks.has(spec)) marks.set(spec, []);
    return marks.get(spec);
  };

  on('before:spec', (spec) => {
    startedAt.set(spec.absolute, Date.now());
    marks.set(spec.absolute, []);
  });
  on('task', {
    'scenario:start'({ spec, title }) {
      const t0 = startedAt.get(spec) ?? Date.now();
      list(spec).push({ title, state: '', start_ms: Date.now() - t0, end_ms: null });
      return null;
    },
    'scenario:end'({ spec, title, state }) {
      const t0 = startedAt.get(spec) ?? Date.now();
      const open = list(spec).findLast((mark) => mark.title === title && mark.end_ms === null);
      if (open) {
        open.end_ms = Date.now() - t0;
        open.state = state;
      }
      return null;
    },
  });
  // ONE handler for both files: Cypress keeps only the last `after:spec` a
  // config registers, so a second registration would silently drop the first.
  on('after:spec', (spec, results) => {
    writeSpecResults(config, spec, results);
    if (!results?.video) return;
    const sidecar = {
      spec: spec.relative,
      video: results.video,
      scenarios: list(spec.absolute).filter((mark) => mark.end_ms !== null),
    };
    fs.writeFileSync(`${results.video}.scenarios.json`, `${JSON.stringify(sidecar, null, 2)}\n`);
  });
}

/**
 * Every test the spec holds, as Cypress itself counted it, into
 * `$E2E_RESULTS_DIR` (the workflow sets it; nothing is written without it).
 *
 * The JUnit report cannot be the source for this: when a `before` hook fails,
 * mocha never reports the tests it blocked, so they are absent from the XML and
 * the spec reads as one failure among tests that "passed". Cypress's own
 * results list every test, blocked ones as `skipped`, with the error as the
 * runner printed it.
 */
function writeSpecResults(config, spec, results) {
  const dir = process.env.E2E_RESULTS_DIR;
  if (!dir) return;
  const project = path.basename(config?.projectRoot ?? process.cwd());
  const body = {
    project,
    spec: spec.relative,
    // Set when the spec could not run at all (a compile error, a crashed
    // browser) — then there are no tests to list, and this is the only trace.
    error: results?.error ?? '',
    tests: (results?.tests ?? []).map((test) => ({
      title: test.title,
      state: test.state,
      duration_ms: Number.isFinite(test.duration) ? test.duration : null,
      error: test.displayError ?? '',
    })),
  };
  fs.mkdirSync(dir, { recursive: true });
  const file = `${project}--${spec.relative.replaceAll(/[^\w.-]+/g, '_')}.json`;
  fs.writeFileSync(path.join(dir, file), `${JSON.stringify(body, null, 2)}\n`);
}
