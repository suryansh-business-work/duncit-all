#!/usr/bin/env node
/**
 * Moves the hand-built marketing sites into the Website CMS.
 *
 *   node scripts/cms-migrate.mjs --dry-run --out <dir>        write each site's plan as JSON, touch nothing
 *   node scripts/cms-migrate.mjs --env local                   migrate into the API at --graphql
 *
 * Options:
 *   --env local|staging|production   which domains the sites get (default local)
 *   --graphql <url>                  the API to write to (default http://localhost:2001/graphql)
 *   --sites main,ads                 a subset (default: all four)
 *   --dist-root <dir>                where each site's build lives as <dir>/<folder> (default website/<folder>/dist)
 *   CMS_MIGRATE_EMAIL / CMS_MIGRATE_PASSWORD, or CMS_MIGRATE_TOKEN — a SUPER_ADMIN or WEBSITE_MANAGER.
 *
 * Build each site against the SAME environment first: its pages carry the
 * copy, navigation and policy list that environment served at build time.
 *
 * What moves: every built page (as editable html, published), the shared
 * header/footer (as fragments), the compiled stylesheet + design tokens (as
 * the site's design system), the blog/careers/newsroom list pages (as
 * collection templates), and every Blog/Careers/Newsroom item from Website
 * Content (as collection entries). Brand components become live blocks and the
 * interactive widgets keep working through @duncit/brand. Idempotent.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractSite } from './lib/cms-extract.mjs';
import { CONTENT_COLLECTIONS, LEGACY_SITES } from './lib/cms-sites.mjs';
import { createClient, login, upsertEntry, upsertFragment, upsertPage, upsertSite } from './lib/cms-migrate-api.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? fallback : args[at + 1];
};
const dryRun = args.includes('--dry-run');
const env = option('env', 'local');
const graphql = option('graphql', 'http://localhost:2001/graphql');
const wanted = option('sites', '')?.split(',').filter(Boolean);
const distRoot = option('dist-root', null);
const sites = LEGACY_SITES.filter((site) => !wanted.length || wanted.includes(site.key));

function plan(site) {
  const dist = distRoot ? join(distRoot, site.folder) : join(ROOT, 'website', site.folder, 'dist');
  const publicDir = join(ROOT, 'website', site.folder, 'public');
  return extractSite(site, { dist, publicDir });
}

function siteInput(site, extracted, chrome = {}) {
  const home = extracted.pages.find((page) => page.path === '/');
  return {
    key: site.key,
    name: site.name,
    domains: site.domains[env] ?? [],
    legacy_site: site.legacy,
    is_active: true,
    favicon_url: extracted.favicon,
    seo: { title: home?.seo.title ?? site.name, description: home?.seo.description ?? '', og_image_url: home?.seo.og_image_url ?? '' },
    collections: site.collections,
    header_fragment_id: chrome.header ?? null,
    footer_fragment_id: chrome.footer ?? null,
  };
}

/** Website Content items (the portal's Blog / Careers / Newsroom) → entries. */
async function importContent(gql, siteId, site) {
  let count = 0;
  for (const [type, collection] of Object.entries(CONTENT_COLLECTIONS)) {
    if (!site.collections.includes(collection)) continue;
    const { websiteContent } = await gql(
      `query($type: WebsitePageType) { websiteContent(type: $type) { title slug summary body category image_url cta_label cta_url published_at is_published sort_order } }`,
      { type }
    );
    for (const item of websiteContent) {
      const fields = [];
      if (item.cta_url) fields.push({ key: 'cta_url', value: item.cta_url }, { key: 'cta_label', value: item.cta_label ?? '' });
      await upsertEntry(gql, siteId, {
        collection_type: collection,
        title: item.title,
        slug: item.slug,
        summary: item.summary ?? '',
        body_html: item.body ?? '',
        cover_image_url: item.image_url ?? '',
        category: item.category ?? '',
        fields,
        is_published: item.is_published,
        published_at: item.published_at || null,
        sort_order: item.sort_order ?? 0,
      });
      count += 1;
    }
  }
  return count;
}

async function migrate(gql, site) {
  const extracted = plan(site);
  const created = await upsertSite(gql, siteInput(site, extracted));
  await gql('mutation($id: ID!, $input: CmsDesignInput!) { updateCmsSiteDesign(site_id: $id, input: $input) { id } }', {
    id: created.id,
    input: extracted.design,
  });
  const chrome = {};
  for (const fragment of extracted.fragments) chrome[fragment.key] = await upsertFragment(gql, created.id, fragment);
  await upsertSite(gql, siteInput(site, extracted, chrome));
  for (const page of extracted.pages) await upsertPage(gql, created.id, { ...page, kind: 'PAGE' });
  for (const template of extracted.templates) await upsertPage(gql, created.id, template);
  const entries = await importContent(gql, created.id, site);
  console.log(
    `cms-migrate: ${site.key} → ${extracted.pages.length} page(s), ${extracted.templates.length} template(s), ` +
      `${extracted.fragments.length} fragment(s), ${extracted.design.tokens.length} token(s), ${entries} entr(ies)`
  );
}

async function main() {
  if (dryRun) {
    const out = resolve(option('out', join(ROOT, '.cms-migrate')));
    mkdirSync(out, { recursive: true });
    for (const site of sites) {
      const extracted = plan(site);
      writeFileSync(join(out, `${site.key}.json`), JSON.stringify({ site: siteInput(site, extracted), ...extracted }, null, 2));
      console.log(`cms-migrate (dry run): ${site.key} → ${extracted.pages.length} page(s), ${extracted.templates.length} template(s), ${extracted.fragments.length} fragment(s) → ${out}`);
    }
    return;
  }
  const token =
    process.env.CMS_MIGRATE_TOKEN || (await login(graphql, process.env.CMS_MIGRATE_EMAIL ?? '', process.env.CMS_MIGRATE_PASSWORD ?? ''));
  const gql = createClient(graphql, token);
  for (const site of sites) await migrate(gql, site);
}

main().catch((error) => {
  console.error(`cms-migrate: ${error.message}`);
  process.exit(1);
});
