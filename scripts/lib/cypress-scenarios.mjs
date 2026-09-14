import fs from 'node:fs';

/**
 * Where each scenario sits inside a spec's recording, for the per-scenario
 * clips the E2E Slack thread shows (scripts/e2e-videos.mjs stitch mode).
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
export function registerScenarioClips(on) {
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
  on('after:spec', (spec, results) => {
    if (!results?.video) return;
    const sidecar = {
      spec: spec.relative,
      video: results.video,
      scenarios: list(spec.absolute).filter((mark) => mark.end_ms !== null),
    };
    fs.writeFileSync(`${results.video}.scenarios.json`, `${JSON.stringify(sidecar, null, 2)}\n`);
  });
}
