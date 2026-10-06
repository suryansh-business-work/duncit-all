/**
 * Turns every migrated page into a sequence of components.
 *
 * A hand-built page is one wrapper (the framed content area) holding its
 * sections: a hero, a feature band, a live block like the reel slider. Each of
 * those becomes its own CMS component (a SECTION fragment) and the page keeps
 * only the wrapper with `<cms-fragment>` placeholders in their place — so a
 * section is edited once, dragged into any page, and reordered freely.
 *
 *   - A section (any element) becomes "<Page> · <its heading>".
 *   - A live block (`<cms-block>`: reel slider, earn showcase, newsletter, app
 *     download…) becomes ONE component per site and set of props, shared by
 *     every page that shows it.
 *   - Identical markup on two pages is one component, used by both.
 *
 * Rendering is unchanged: the server swaps each placeholder back for the same
 * markup (wrapped in a `display: contents` element), so every page looks
 * exactly as it did.
 */
import { createHash } from 'node:crypto';
import { decodeEntities, topLevelNodes } from './cms-html.mjs';

/** Below this a node is glue (a spacer, a backdrop), not a section worth naming. */
const MIN_SECTION = 200;
/** The framed content area: the one big wrapper every page puts its sections in. */
const MIN_WRAPPER = 1000;
const MAX_KEY = 60;

const BLOCK_NAMES = {
  'reel-slider': 'Reel Slider',
  'earn-showcase': 'Earn with Duncit',
  newsletter: 'Newsletter signup',
  'app-download': 'App download',
  'social-links': 'Social links',
  'policy-strip': 'Policy links',
};

const slug = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');

const tagOf = (html) => /^<([a-z0-9-]+)/i.exec(html.trim())?.[1]?.toLowerCase() ?? '';
const openTagOf = (html) => /^<[^>]+>/.exec(html.trim())?.[0] ?? '';
const innerOf = (html) => html.trim().slice(openTagOf(html).length).replace(/<\/[a-z0-9-]+>\s*$/i, '');

/** The first heading's text — what a person would call this section. */
function headingOf(html) {
  const match = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i.exec(html);
  if (!match) return '';
  return decodeEntities(match[1].replaceAll(/<[^>]+>/g, ' ')).replaceAll(/\s+/g, ' ').trim();
}

const pageName = (path) => (path === '/' ? 'Home' : path.split('/').filter(Boolean).map((part) => part.replaceAll('-', ' ')).join(' / ')).replace(/^./, (c) => c.toUpperCase());

function uniqueKey(base, used) {
  const root = (base || 'section').slice(0, MAX_KEY - 4).replaceAll(/-+$/g, '');
  let key = root;
  for (let n = 2; used.has(key); n += 1) key = `${root}-${n}`;
  used.add(key);
  return key;
}

/**
 * @param site   the legacy site ({ key, name })
 * @param pages  [{ path, html }] — html already has the shared chrome as fragments
 * @param taken  keys already used by the chrome fragments
 * @returns { components: [{ key, name, kind, html }], pages: [{ path, html }] }
 */
export function splitIntoComponents(site, pages, taken) {
  const used = new Set(taken);
  const byHtml = new Map();
  const components = [];

  const componentFor = (html, describe) => {
    const known = byHtml.get(html);
    if (known) return known.key;
    const { key, name } = describe(used);
    const component = { key, name, kind: 'SECTION', html };
    byHtml.set(html, component);
    components.push(component);
    return key;
  };

  const placeholder = (key) => `<cms-fragment data-key="${key}"></cms-fragment>`;

  const out = pages.map((page) => {
    const nodes = topLevelNodes(page.html);
    let wrapperIndex = -1;
    nodes.forEach((node, index) => {
      const isWrapper = node.length >= MIN_WRAPPER && ['div', 'main'].includes(tagOf(node));
      if (isWrapper && (wrapperIndex < 0 || node.length > nodes[wrapperIndex].length)) wrapperIndex = index;
    });
    if (wrapperIndex < 0) return page;
    const wrapper = nodes[wrapperIndex];
    const children = topLevelNodes(innerOf(wrapper)).map((child) => {
      const tag = tagOf(child);
      if (tag === 'cms-fragment' || child.length < (tag === 'cms-block' ? 1 : MIN_SECTION)) return child;
      if (tag === 'cms-block') {
        const block = /data-block="([a-z0-9-]+)"/.exec(child)?.[1] ?? 'block';
        return placeholder(
          componentFor(child, (keys) => {
            const hash = createHash('sha1').update(child).digest('hex').slice(0, 6);
            const key = keys.has(block) ? uniqueKey(`${block}-${hash}`, keys) : uniqueKey(block, keys);
            return { key, name: BLOCK_NAMES[block] ?? block };
          })
        );
      }
      const heading = headingOf(child);
      return placeholder(
        componentFor(child, (keys) => ({
          key: uniqueKey(`${slug(pageName(page.path))}-${slug(heading) || 'content'}`, keys),
          name: `${pageName(page.path)} · ${heading || 'Content'}`.slice(0, 120),
        }))
      );
    });
    nodes[wrapperIndex] = openTagOf(wrapper) + children.join('\n') + `</${tagOf(wrapper)}>`;
    return { ...page, html: nodes.join('\n') };
  });

  return { components, pages: out };
}
