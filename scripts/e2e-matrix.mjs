#!/usr/bin/env node
/**
 * What the E2E workflow should actually run, given the suites it was asked for.
 *
 * The full list lives here rather than inline in the workflow because it is
 * read three ways — the browser matrix needs each leg's directory and preview
 * port, the two standalone jobs need to know whether they were selected, and
 * the run needs to record every leg that was NOT selected as SKIPPED so a
 * partial run cannot be mistaken for a green one.
 *
 * It is the repo-side half of a pair. The Tech portal's picker is served from
 * `server/src/modules/platform/e2eRun/e2eRun.suites.ts`, which holds the same
 * NAMES with their on-screen labels; directories and ports are facts about this
 * repository and stay here. Both halves refuse a name the other could not have
 * produced, so drift is a loud failure at the start of a run rather than a leg
 * that quietly never happens.
 *
 * Usage:  node scripts/e2e-matrix.mjs "admin,mweb"     # empty argument = all
 * Writes matrix / browser_count / selected / skipped to $GITHUB_OUTPUT, and
 * prints the plan either way so a local run is readable.
 */
import fs from 'node:fs';
import process from 'node:process';

/**
 * Every portal and app with a browser to drive, and where its preview serves.
 *
 * A row may name its own `build` and `e2e` scripts; the workflow falls back to
 * `build:e2e` / `e2e` when it does not. `live: true` marks the one leg that
 * talks to a real server instead of stubbing GraphQL — the workflow points its
 * build at the staging API and purges what the suite created afterwards.
 */
const BROWSER_SUITES = [
  { name: 'admin', dir: 'portals/admin', port: 2002 },
  { name: 'ads-portal', dir: 'portals/ads-portal', port: 2006 },
  { name: 'ai', dir: 'portals/ai', port: 2013 },
  { name: 'challenge-portal', dir: 'portals/challenge-portal', port: 2026 },
  { name: 'crm', dir: 'portals/crm', port: 2007 },
  { name: 'developers', dir: 'portals/developers', port: 2027 },
  { name: 'employee', dir: 'portals/employee', port: 2018 },
  { name: 'finance', dir: 'portals/finance', port: 2008 },
  { name: 'hr', dir: 'portals/hr', port: 2017 },
  { name: 'legal', dir: 'portals/legal', port: 2012 },
  { name: 'marketing', dir: 'portals/marketing', port: 2015 },
  { name: 'onboarding', dir: 'portals/onboarding', port: 2016 },
  { name: 'partners-app', dir: 'portals/partners-app', port: 2005 },
  { name: 'products', dir: 'portals/products', port: 2014 },
  { name: 'regional-club-admin', dir: 'portals/regional-club-admin', port: 2029 },
  { name: 'venues', dir: 'portals/venues', port: 2030 },
  { name: 'clubs', dir: 'portals/clubs', port: 2031 },
  { name: 'club-admins', dir: 'portals/club-admins', port: 2032 },
  { name: 'hosts', dir: 'portals/hosts', port: 2033 },
  { name: 'pods', dir: 'portals/pods', port: 2034 },
  { name: 'support', dir: 'portals/support', port: 2010 },
  { name: 'tech', dir: 'portals/tech', port: 2009 },
  { name: 'website-app', dir: 'portals/website-app', port: 2011 },
  { name: 'mweb', dir: 'app/mweb', port: 2003 },
  // Same app, same port, a different build and a different spec directory:
  // app/mweb/__tests__/e2e-live drives the real staging server. Each matrix
  // leg is its own runner, so the port never collides with the mocked suite.
  {
    name: 'mweb-live',
    dir: 'app/mweb',
    port: 2003,
    build: 'build:e2e:live',
    e2e: 'e2e:live',
    specs_tsconfig: '__tests__/e2e-live/tsconfig.json',
    live: true,
  },
];

/**
 * The legs that are not matrix rows. `native-web` is a standalone npm workspace
 * (its own package-lock, never listed in pnpm-workspace.yaml) and `no-surface`
 * is the packages/websites/API sweep, so neither can be a row in a pnpm matrix.
 */
const STANDALONE_SUITES = ['native-web', 'no-surface'];

const ALL = [...BROWSER_SUITES.map((s) => s.name), ...STANDALONE_SUITES];

const requested = (process.argv[2] ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const unknown = requested.filter((name) => !ALL.includes(name));
if (unknown.length > 0) {
  console.error(
    `e2e-matrix: not a suite this repository runs: ${unknown.join(', ')}\n` +
      `Known suites: ${ALL.join(', ')}\n` +
      'If a suite was added, add it to BOTH this file and the server catalogue in\n' +
      'server/src/modules/platform/e2eRun/e2eRun.suites.ts.'
  );
  process.exit(1);
}

// No filter means every suite — the same convention the portal and the server
// use, so "all" is one shape rather than a list that has to stay in step.
const wanted = new Set(requested.length > 0 ? requested : ALL);

const matrix = BROWSER_SUITES.filter((suite) => wanted.has(suite.name));
const selected = ALL.filter((name) => wanted.has(name));
const skipped = ALL.filter((name) => !wanted.has(name));

console.log(`Running ${selected.length} of ${ALL.length} suites: ${selected.join(', ')}`);
if (skipped.length > 0) console.log(`Skipping: ${skipped.join(', ')}`);

const outputs = {
  matrix: JSON.stringify(matrix),
  browser_count: String(matrix.length),
  selected: selected.join(','),
  skipped: skipped.join(','),
};

if (process.env.GITHUB_OUTPUT) {
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
}
