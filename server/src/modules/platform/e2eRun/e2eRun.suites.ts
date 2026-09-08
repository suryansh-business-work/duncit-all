/**
 * The suites a run can be asked for.
 *
 * This is the list the Tech portal offers and the list a request is validated
 * against. It is deliberately NOT where the matrix lives: the workflow owns the
 * directory and the preview port of each leg, because those are facts about the
 * repository, and a database is the wrong place to keep them. What lives here
 * is the NAME of each leg and what to call it on screen — and the workflow
 * filters its static matrix on exactly these names.
 *
 * Adding a portal therefore means two edits, in the same commit: the matrix in
 * `.github/workflows/e2e.yml` and this list. A name in one and not the other is
 * visible immediately — a suite offered here that no leg matches simply runs
 * nothing, and the run says so, because every leg reports and a suite that
 * never reported has no row.
 */

/** Which part of the platform a suite drives. Groups the picker. */
export type E2eSuiteGroup = 'PORTAL' | 'APP' | 'SHARED';

export interface E2eSuiteDefinition {
  /** The matrix leg's name. This is what travels in the `suites` input. */
  key: string;
  label: string;
  group: E2eSuiteGroup;
}

const portal = (key: string, label: string): E2eSuiteDefinition => ({
  key,
  label,
  group: 'PORTAL',
});

export const E2E_SUITES: readonly E2eSuiteDefinition[] = [
  portal('admin', 'Admin'),
  portal('ads-portal', 'Ads'),
  portal('ai', 'AI'),
  portal('challenge-portal', 'Challenge'),
  portal('crm', 'CRM'),
  portal('developers', 'Developers'),
  portal('employee', 'Employee'),
  portal('finance', 'Finance'),
  portal('hr', 'HR'),
  portal('legal', 'Legal'),
  portal('marketing', 'Marketing'),
  portal('onboarding', 'Onboarding'),
  portal('partners-app', 'Partners'),
  portal('products', 'Products'),
  portal('support', 'Support'),
  portal('tech', 'Tech'),
  portal('website-app', 'Website'),
  { key: 'mweb', label: 'mWeb', group: 'APP' },
  // The one suite that talks to a REAL server: it signs in and signs up as the
  // run's identity, creates pods, tickets and ideas on staging, and the leg
  // purges everything it made afterwards (purgeE2eRunData).
  { key: 'mweb-live', label: 'mWeb (live flows on staging)', group: 'APP' },
  { key: 'native-web', label: 'Native app (web)', group: 'APP' },
  {
    key: 'no-surface',
    label: 'Shared packages, websites and API',
    group: 'SHARED',
  },
];

const SUITE_KEYS = new Set(E2E_SUITES.map((suite) => suite.key));

/**
 * The requested suites, cleaned up. An empty result means EVERY suite, which is
 * also what an empty request means — the workflow reads a blank filter as "run
 * all", so the two agree without a magic value.
 */
export function normaliseSuites(asked: unknown): string[] {
  const list = Array.isArray(asked) ? asked : [];
  const wanted = new Set(list.map((value) => String(value ?? '').trim()).filter(Boolean));
  const unknown = [...wanted].filter((key) => !SUITE_KEYS.has(key));
  if (unknown.length > 0) {
    throw new Error(`Not a suite this repository runs: ${unknown.join(', ')}`);
  }
  // Kept in catalogue order rather than the caller's, so the same selection
  // always produces the same input string and the same row.
  const chosen = E2E_SUITES.filter((suite) => wanted.has(suite.key)).map((suite) => suite.key);
  return chosen.length === E2E_SUITES.length ? [] : chosen;
}

/** The `suites` workflow input: a comma-separated list, or empty for all of them. */
export const suitesInput = (suites: readonly string[]): string => suites.join(',');
