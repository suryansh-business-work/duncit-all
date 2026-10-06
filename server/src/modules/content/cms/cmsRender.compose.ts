import { escapeHtml } from '@utils/html';

/**
 * Pure HTML composition for the CMS renderer. Everything here works on the
 * exact placeholder markup the portal's GrapesJS components emit, so each
 * pattern is a fixed shape, not an HTML parser:
 *
 *   <cms-fragment data-key="hero-cta"></cms-fragment>   a SECTION fragment
 *   <cms-field data-field="title"></cms-field>          an entry's field
 *   <cms-entry-list data-variant="cards"></cms-entry-list>  a collection list
 *
 * `<cms-block …>` (newsletter, reel slider, calculators…) is NOT handled here:
 * those are live widgets the Astro renderer draws itself. This file only
 * WRITES one: the `apply` block on a careers opening, because the opening is
 * data, not something a designer places.
 */

export interface ComposedPart {
  html: string;
  css: string;
}

export interface RenderEntry {
  id: string;
  /** A careers opening: its card and its page carry an Apply button. */
  apply: boolean;
  title: string;
  slug: string;
  summary: string;
  body_html: string;
  cover_image_url: string;
  category: string;
  tags: string[];
  author_name: string;
  fields: { key: string; value: string }[];
  published_at: Date | null;
}

const FRAGMENT_TAG = /<cms-fragment data-key="([a-z0-9-]+)"><\/cms-fragment>/g;
const FIELD_TAG = /<cms-field data-field="([a-z0-9_:-]+)"><\/cms-field>/g;
const LIST_TAG = /<cms-entry-list data-variant="(cards|rows|compact)"><\/cms-entry-list>/g;

/** A fragment may hold fragments, but only this deep — a fragment that
 * includes itself would otherwise never finish rendering. */
const MAX_FRAGMENT_DEPTH = 3;

/**
 * Swaps every fragment placeholder for that fragment's html (wrapped, so it
 * can be styled and found again) and gathers each used fragment's css once.
 * An unknown or unpublished fragment renders as nothing rather than as a
 * broken tag on a live page.
 */
export function expandFragments(html: string, fragments: Map<string, ComposedPart>, depth = 0, used = new Set<string>()): ComposedPart {
  const css: string[] = [];
  const out = html.replaceAll(FRAGMENT_TAG, (_match, key: string) => {
    const fragment = fragments.get(key);
    if (!fragment || depth >= MAX_FRAGMENT_DEPTH) return '';
    const inner = expandFragments(fragment.html, fragments, depth + 1, used);
    if (!used.has(key)) {
      used.add(key);
      css.push(fragment.css, inner.css);
    }
    return `<div data-cms-fragment="${key}">${inner.html}</div>`;
  });
  return { html: out, css: css.filter(Boolean).join('\n') };
}

/** The keys of every fragment a piece of html refers to. */
export function fragmentKeys(html: string): string[] {
  return [...new Set([...html.matchAll(FRAGMENT_TAG)].map((match) => match[1]))];
}

const dateText = (value: Date | null) =>
  value ? `<time datetime="${value.toISOString()}">${escapeHtml(value.toISOString().slice(0, 10))}</time>` : '';

/** One entry field as html: text is escaped, the body is the editor's html. */
export function fieldHtml(entry: RenderEntry, field: string): string {
  if (field.startsWith('field:')) {
    const key = field.slice('field:'.length);
    return escapeHtml(entry.fields.find((f) => f.key === key)?.value ?? '');
  }
  switch (field) {
    case 'title':
    case 'summary':
    case 'category':
    case 'author_name':
      return escapeHtml(entry[field] ?? '');
    case 'body_html':
      // Written in the portal's rich-text editor by a WEBSITE_MANAGER — the
      // same people who can add custom JS — so it is trusted as authored.
      return entry.body_html ?? '';
    case 'published_at':
      return dateText(entry.published_at);
    case 'tags':
      return entry.tags.map((tag) => `<span class="cms-tag">${escapeHtml(tag)}</span>`).join('');
    case 'apply':
      return applyBlock(entry);
    case 'cover_image':
      return entry.cover_image_url
        ? `<img class="cms-cover" src="${escapeHtml(entry.cover_image_url)}" alt="${escapeHtml(entry.title)}" loading="lazy">`
        : '';
    default:
      return '';
  }
}

const APPLY_FIELD = '<cms-field data-field="apply"></cms-field>';
const BODY_FIELD = '<cms-field data-field="body_html"></cms-field>';

/** The renderer draws this as a localised Apply button opening the job-application dialog. */
function applyBlock(entry: RenderEntry): string {
  if (!entry.apply) return '';
  const props = JSON.stringify({ role: entry.title, role_id: entry.id });
  return `<cms-block data-block="apply" data-props="${escapeHtml(props)}"></cms-block>`;
}

/** A careers page gets its Apply button even when its template never placed one: under the body, else at the end. */
function withApply(html: string, entry: RenderEntry): string {
  if (!entry.apply || html.includes(APPLY_FIELD)) return html;
  return html.includes(BODY_FIELD) ? html.replace(BODY_FIELD, BODY_FIELD + APPLY_FIELD) : html + APPLY_FIELD;
}

export const bindEntry = (html: string, entry: RenderEntry) =>
  withApply(html, entry).replaceAll(FIELD_TAG, (_match, field: string) => fieldHtml(entry, field));

function entryCard(entry: RenderEntry, basePath: string, variant: string): string {
  const href = escapeHtml(`${basePath}/${entry.slug}`);
  const cover = variant === 'cards' ? fieldHtml(entry, 'cover_image') : '';
  const category = entry.category ? `<span class="cms-card__category">${escapeHtml(entry.category)}</span>` : '';
  const summary = entry.summary && variant !== 'compact' ? `<p class="cms-card__summary">${escapeHtml(entry.summary)}</p>` : '';
  return (
    `<article class="cms-card cms-card--${variant}">` +
    (cover ? `<a class="cms-card__media" href="${href}" tabindex="-1" aria-hidden="true">${cover}</a>` : '') +
    `<div class="cms-card__body">${category}` +
    `<h2 class="cms-card__title"><a href="${href}">${escapeHtml(entry.title)}</a></h2>` +
    `${summary}<div class="cms-card__meta">${dateText(entry.published_at)}</div>${applyBlock(entry)}</div></article>`
  );
}

/** Fills every list placeholder with the entries of the current page. */
export function renderLists(html: string, entries: RenderEntry[], basePath: string): string {
  return html.replaceAll(LIST_TAG, (_match, variant: string) =>
    entries.length
      ? `<div class="cms-list cms-list--${variant}">${entries.map((entry) => entryCard(entry, basePath, variant)).join('')}</div>`
      : '<div class="cms-list cms-list--empty"></div>'
  );
}

/** Used until a site designs its own list template in the editor. */
export const DEFAULT_LIST_TEMPLATE = '<section class="cms-collection"><cms-entry-list data-variant="cards"></cms-entry-list></section>';

/** Used until a site designs its own detail template in the editor. */
export const DEFAULT_DETAIL_TEMPLATE =
  '<article class="cms-entry">' +
  '<header class="cms-entry__header"><p class="cms-entry__category"><cms-field data-field="category"></cms-field></p>' +
  '<h1 class="cms-entry__title"><cms-field data-field="title"></cms-field></h1>' +
  '<p class="cms-entry__meta"><cms-field data-field="published_at"></cms-field></p></header>' +
  '<cms-field data-field="cover_image"></cms-field>' +
  '<div class="cms-entry__body"><cms-field data-field="body_html"></cms-field></div>' +
  '</article>';
