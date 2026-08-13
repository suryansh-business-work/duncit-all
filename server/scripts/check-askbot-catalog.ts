/**
 * Proves the Ask Bot's navigation map is internally consistent.
 *
 * A page pointing at a surface key that does not exist is invisible: the link
 * resolver silently drops it, so the bot answers confidently and hands back
 * nothing. That failure has no other gate — the data is prose, so tsc cannot see
 * it — which is why this runs as its own check.
 */
import { NAVIGATION_PAGES, findPage, navigationMap } from '../src/modules/ai/askBot/askBot.catalog';
import { SURFACES, SURFACE_BY_KEY } from '../src/modules/ai/askBot/askBot.surfaces';
import { surfaceUrl } from '../src/modules/ai/askBot/askBot.links';

const failures: string[] = [];

// 1. Every page belongs to a surface that exists.
for (const page of NAVIGATION_PAGES) {
  if (!SURFACE_BY_KEY.has(page.surface)) {
    failures.push(`unknown surface "${page.surface}" on ${page.path}`);
  }
  if (!page.path.startsWith('/')) failures.push(`path must start with / — ${page.surface} ${page.path}`);
  if (!page.description.trim()) failures.push(`empty description — ${page.surface} ${page.path}`);
}

// 2. No surface+path appears twice — the index is a Map, so a duplicate would
//    silently shadow the earlier row.
const seen = new Set<string>();
for (const page of NAVIGATION_PAGES) {
  const key = `${page.surface} ${page.path}`;
  if (seen.has(key)) failures.push(`duplicate page ${key}`);
  seen.add(key);
}

// 3. Every surface has at least one page, or the bot can never send anyone there.
for (const surface of SURFACES) {
  const count = NAVIGATION_PAGES.filter((page) => page.surface === surface.key).length;
  if (count === 0) failures.push(`surface "${surface.key}" has no pages`);
}

// 4. Every page round-trips through the lookup the resolver uses.
for (const page of NAVIGATION_PAGES) {
  if (!findPage(page.surface, page.path)) failures.push(`findPage missed ${page.surface} ${page.path}`);
}

// 5. Links resolve per environment, and only the native app lacks a local one.
for (const surface of SURFACES) {
  const local = surfaceUrl(surface, 'LOCAL', '/x');
  const staging = surfaceUrl(surface, 'STAGING', '/x');
  const production = surfaceUrl(surface, 'PRODUCTION', '/x');
  if (surface.dev_port > 0 && local !== `http://localhost:${surface.dev_port}/x`) {
    failures.push(`local url wrong for ${surface.key}: ${local}`);
  }
  if (surface.dev_port === 0 && local !== '') failures.push(`${surface.key} should have no local url`);
  if (staging !== `https://staging.${surface.host}/x`) failures.push(`staging url wrong for ${surface.key}`);
  if (production !== `https://${surface.host}/x`) failures.push(`production url wrong for ${surface.key}`);
}

const map = navigationMap();
console.log(
  `ask-bot catalogue: ${SURFACES.length} surfaces, ${NAVIGATION_PAGES.length} pages, ` +
    `map ${map.length.toLocaleString()} chars (~${Math.round(map.length / 4).toLocaleString()} tokens)`
);

if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('ask-bot catalogue is consistent');
