/**
 * Turns one built legacy site (its Astro `dist/`) into a CMS migration plan:
 * the site's design system, its header/footer fragments, every page as
 * editable html, and its collection list templates. Pure: reads files, returns
 * data; scripts/cms-migrate.mjs decides where the plan goes.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { attr, bodyOf, decodeEntities, escapeAttr, findElements, hasAttr, headOf, replaceElements, topLevelNodes } from './cms-html.mjs';
import { splitIntoComponents } from './cms-components.mjs';

/** Built pages that do not become CMS pages: a query-string reader the
 * collection detail replaces, a redirect stub and a build-time fallback. */
const SKIPPED_PATHS = new Set(['/blog/post', '/policy', '/policy/_reader']);

/** Legacy list pages that become a collection's list template instead. */
const LIST_TEMPLATES = { '/blog': 'BLOG', '/careers': 'CAREER', '/newsroom': 'NEWSROOM' };
const LIST_VARIANT = { cards: 'cards', jobs: 'rows', news: 'rows' };
const ENTRY_LIST = /<cms-entry-list data-variant="[a-z]+"><\/cms-entry-list>/;
/** One entry, built from the CMS's field placeholders — the same shape as the
 * renderer's default detail page, styled by the site's design system. */
const ENTRY_DETAIL =
  '<article class="cms-entry">' +
  '<p class="cms-entry__category"><cms-field data-field="category"></cms-field></p>' +
  '<h1 class="cms-entry__title"><cms-field data-field="title"></cms-field></h1>' +
  '<p class="cms-entry__meta"><cms-field data-field="published_at"></cms-field></p>' +
  '<cms-field data-field="cover_image"></cms-field>' +
  '<div class="cms-entry__body"><cms-field data-field="body_html"></cms-field></div>' +
  '</article>';

const TOKEN_PREFIXES = ['--color-', '--font-', '--radius-', '--shadow-', '--spacing'];

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

/** `about/index.html` → `/about`; `404.html` → `/404`. */
export function pathOf(file, dist) {
  const rel = relative(dist, file).split(sep).join('/').replace(/\.html$/, '');
  const trimmed = rel === 'index' ? '' : rel.replace(/\/index$/, '');
  return `/${trimmed}`;
}

const metaContent = (head, key) => {
  const tag = new RegExp(String.raw`<meta[^>]+(?:name|property)="${key}"[^>]*>`).exec(head)?.[0];
  return tag ? (attr(tag, 'content') ?? '') : '';
};

function readSeo(head, siteName) {
  let title = decodeEntities(/<title>([^<]*)<\/title>/.exec(head)?.[1] ?? '').trim();
  for (const suffix of [` | ${siteName}`, ` — ${siteName}`, ' — Duncit', ' | Duncit']) {
    if (title.endsWith(suffix) && title.length > suffix.length) title = title.slice(0, -suffix.length);
  }
  return {
    title,
    description: decodeEntities(metaContent(head, 'description')),
    og_image_url: metaContent(head, 'og:image'),
  };
}

/** Every stylesheet a page uses: local css files, inline <style>, external links. */
function readStyles(document, dist) {
  const local = [];
  const external = [];
  for (const { token } of findElements(document, (t) => t.name === 'link' && attr(t.attrs, 'rel') === 'stylesheet')) {
    const href = attr(token.attrs, 'href') ?? '';
    if (href.startsWith('https://')) external.push(href);
    else if (href.startsWith('/') && existsSync(join(dist, href))) local.push(readFileSync(join(dist, href), 'utf8'));
  }
  for (const element of findElements(document, (t) => t.name === 'style')) {
    local.push(document.slice(element.start, element.end).replace(/^<style[^>]*>/, '').replace(/<\/style>$/, ''));
  }
  return { local, external };
}

/** `/media/reel.mp4` → `/legacy/main/media/reel.mp4`, only for files the site ships. */
function rewriteAssets(html, publicDir, prefix) {
  return html.replaceAll(/\b(src|href|poster|content)="(\/[^"/][^"]*)"/g, (match, name, url) => {
    const file = url.split(/[?#]/)[0];
    return existsSync(join(publicDir, file)) ? `${name}="${prefix}${url}"` : match;
  });
}

/** A brand component (marked by @duncit/brand) becomes a live CMS block. */
function toBlocks(html) {
  return replaceElements(
    html,
    (t) => hasAttr(t.attrs, 'data-cms-block'),
    (_html, { token }) => {
      const block = attr(token.attrs, 'data-cms-block');
      const props = attr(token.attrs, 'data-cms-props');
      const propsAttr = props ? ` data-props="${escapeAttr(props)}"` : '';
      return `<cms-block data-block="${block}"${propsAttr}></cms-block>`;
    }
  );
}

/** Body html with scripts and styles out, blocks in, assets re-pointed, and
 * the build-time API address dropped (the renderer supplies its own). */
function cleanBody(document, publicDir, prefix) {
  let body = bodyOf(document);
  body = replaceElements(body, (t) => t.name === 'script' || t.name === 'style', () => '');
  body = body.replaceAll(/<!--[\s\S]*?-->/g, '');
  body = toBlocks(body);
  body = body.replaceAll(/\sdata-graphql-url="[^"]*"/g, '');
  return rewriteAssets(body, publicDir, prefix);
}

/** The legacy list page with its browser-fetched list swapped for the CMS's
 * server-rendered one. The legacy apply dialog goes with it: it only ever
 * worked through the script the migration drops. */
function listTemplate(nodes) {
  let html = nodes.join('\n');
  html = replaceElements(html, (t) => t.name === 'dialog' && attr(t.attrs, 'id') === 'applyDialog', () => '');
  let replaced = false;
  html = replaceElements(
    html,
    (t) => hasAttr(t.attrs, 'data-website-content-list'),
    (_html, { token }) => {
      replaced = true;
      const variant = LIST_VARIANT[attr(token.attrs, 'data-variant') ?? ''] ?? 'cards';
      return `<cms-entry-list data-variant="${variant}"></cms-entry-list>`;
    }
  );
  return replaced ? html : `${html}\n<cms-entry-list data-variant="cards"></cms-entry-list>`;
}

/** Elements that can be site chrome wherever they sit in a page. */
const CHROME_TAGS = new Set(['header', 'nav', 'footer', 'aside']);
const MIN_SHARED = 200;

/**
 * Markup most pages repeat byte for byte — the header bar, the drawer, the
 * footer — wherever it sits. Each becomes ONE fragment, referenced in place,
 * so every page renders exactly as before and the piece is edited once.
 * With a single page, only real chrome elements (header, nav, footer, aside)
 * count; every node of a lone page would otherwise look "shared".
 */
function sharedChrome(pages) {
  const candidates = new Map();
  for (const page of pages) {
    const seen = new Set();
    const elements = findElements(page.html, (t) => CHROME_TAGS.has(t.name)).map((e) => page.html.slice(e.start, e.end));
    const nodes = pages.length > 1 ? topLevelNodes(page.html) : [];
    for (const html of [...nodes, ...elements]) {
      if (html.length < MIN_SHARED || seen.has(html)) continue;
      seen.add(html);
      candidates.set(html, (candidates.get(html) ?? 0) + 1);
    }
  }
  const needed = pages.length > 1 ? Math.max(2, Math.ceil(pages.length * 0.6)) : 1;
  const shared = [...candidates].filter(([, count]) => count >= needed).map(([html]) => html);
  // Outermost only: a shared footer's own <nav> is part of the footer fragment.
  return shared.filter((html) => !shared.some((other) => other !== html && other.includes(html)));
}

function fragmentKey(html, used) {
  const tag = /^<([a-z]+)/.exec(html)?.[1] ?? 'section';
  const base = CHROME_TAGS.has(tag) ? tag : 'shared';
  let key = base;
  for (let n = 2; used.has(key); n += 1) key = `${base}-${n}`;
  used.add(key);
  return key;
}

function tokensFrom(css) {
  const root = /:root[^{]*{([^}]*)}/.exec(css)?.[1] ?? '';
  const tokens = [];
  for (const [, name, value] of root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);?/g)) {
    if (!TOKEN_PREFIXES.some((prefix) => name.startsWith(prefix)) || /[;{}<>]/.test(value)) continue;
    tokens.push({ name, value: value.trim(), group: name.split('-')[2] || 'other' });
  }
  return tokens.slice(0, 300);
}

/** The whole plan for one site. */
export function extractSite(site, { dist, publicDir }) {
  const prefix = `/legacy/${site.key}`;
  const css = new Set();
  const external = new Set();
  const pages = [];
  for (const file of htmlFiles(dist)) {
    const path = pathOf(file, dist);
    if (SKIPPED_PATHS.has(path)) continue;
    const document = readFileSync(file, 'utf8');
    const styles = readStyles(document, dist);
    styles.local.forEach((rule) => css.add(rule));
    styles.external.forEach((href) => external.add(href));
    pages.push({ path, seo: readSeo(headOf(document), site.name), html: topLevelNodes(cleanBody(document, publicDir, prefix)).join('\n') });
  }
  pages.sort((a, b) => a.path.localeCompare(b.path));

  const used = new Set();
  const fragments = sharedChrome(pages).map((html) => {
    const key = fragmentKey(html, used);
    return { key, name: `${site.name} — ${key}`, kind: 'SECTION', category: 'Site chrome', description: `The ${key} every page of ${site.name} shares.`, html };
  });
  const out = { pages: [], templates: [] };
  const plain = [];
  for (const page of pages) {
    let html = page.html;
    for (const fragment of fragments) html = html.replaceAll(fragment.html, `<cms-fragment data-key="${fragment.key}"></cms-fragment>`);
    const common = { title: page.seo.title || site.name, seo: page.seo, show_header: true, show_footer: true };
    const collection = LIST_TEMPLATES[page.path];
    if (collection && site.collections.includes(collection)) {
      const list = listTemplate([html]);
      out.templates.push(
        { ...common, kind: 'COLLECTION_LIST', collection, html: list },
        // The entry page wears the same chrome and hero as its list.
        { ...common, kind: 'COLLECTION_DETAIL', collection, html: list.replace(ENTRY_LIST, ENTRY_DETAIL) }
      );
    }
    else plain.push({ ...common, path: page.path, html });
  }
  // Every regular page becomes a sequence of components (cms-components.mjs).
  const split = splitIntoComponents(site, plain, fragments.map((f) => f.key));
  out.pages.push(...split.pages);
  fragments.push(...split.components);
  const baseCss = [...css].join('\n');
  return {
    design: { tokens: tokensFrom(baseCss), font_urls: [...external], base_css: baseCss },
    fragments,
    pages: out.pages,
    templates: out.templates,
    favicon: existsSync(join(publicDir, 'favicon.svg')) ? `${prefix}/favicon.svg` : '',
  };
}
