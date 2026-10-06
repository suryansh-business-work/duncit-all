#!/usr/bin/env node
/**
 * Serves the hand-built sites' own static files (logos, favicons, the home
 * reel) from the CMS renderer at /legacy/<site>/…, which is where the
 * migration points migrated pages. Copied at dev/build time rather than
 * committed twice: each file keeps ONE home, in its legacy site's public/.
 * New images go through the Website portal's ImageKit picker instead.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = resolve(here, '..');
const websites = resolve(site, '..');
const target = join(site, 'public', 'legacy');

const SOURCES = { main: 'main-website', partners: 'partners-website', ads: 'ads-website', earnwith: 'earnwith-website' };

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const [key, folder] of Object.entries(SOURCES)) {
  const from = join(websites, folder, 'public');
  if (existsSync(from)) cpSync(from, join(target, key), { recursive: true });
}
console.log(`sync-legacy-assets: copied ${Object.keys(SOURCES).length} site(s) into public/legacy`);
