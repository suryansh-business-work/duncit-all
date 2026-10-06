import type { BlockProperties, Editor } from 'grapesjs';
import type { FragmentPreview } from './editorComponents';

/**
 * The block library. Basic blocks style themselves with the SITE's tokens
 * (`var(--color-primary)` with a neutral fallback), so the same block looks
 * native on every website — the design system is the site's, not the block's.
 */

export interface BlockLabels {
  categories: { basic: string; layout: string; media: string; duncit: string; fragments: string; collection: string };
  names: Record<string, string>;
  placeholders: { text: string; heading: string; button: string };
}

const pad = 'padding:var(--space-section,4rem) var(--space-gutter,1rem)';
const container = 'max-width:var(--content-width,72rem);margin:0 auto';

function basicBlocks(l: BlockLabels): (BlockProperties & { id: string })[] {
  const n = l.names;
  const p = l.placeholders;
  return [
    {
      id: 'section',
      label: n.section,
      category: l.categories.layout,
      content: `<section style="${pad}"><div style="${container}"><h2>${p.heading}</h2><p>${p.text}</p></div></section>`,
    },
    {
      id: 'columns-2',
      label: n.columns2,
      category: l.categories.layout,
      content: `<section style="${pad}"><div style="${container};display:grid;gap:2rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))"><div><p>${p.text}</p></div><div><p>${p.text}</p></div></div></section>`,
    },
    {
      id: 'columns-3',
      label: n.columns3,
      category: l.categories.layout,
      content: `<section style="${pad}"><div style="${container};display:grid;gap:2rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))"><div><p>${p.text}</p></div><div><p>${p.text}</p></div><div><p>${p.text}</p></div></div></section>`,
    },
    { id: 'heading', label: n.heading, category: l.categories.basic, content: `<h2>${p.heading}</h2>` },
    { id: 'text', label: n.text, category: l.categories.basic, content: { type: 'text', content: p.text } },
    {
      id: 'button',
      label: n.button,
      category: l.categories.basic,
      content: `<a href="#" style="display:inline-block;padding:0.75rem 1.5rem;border-radius:var(--radius-button,999px);background:var(--color-primary,ButtonFace);color:var(--color-on-primary,ButtonText);font-weight:700;text-decoration:none">${p.button}</a>`,
    },
    { id: 'link', label: n.link, category: l.categories.basic, content: { type: 'link', content: p.button, attributes: { href: '#' } } },
    { id: 'list', label: n.list, category: l.categories.basic, content: `<ul><li>${p.text}</li><li>${p.text}</li></ul>` },
    { id: 'quote', label: n.quote, category: l.categories.basic, content: `<blockquote style="margin:0;padding-left:1rem;border-left:4px solid var(--color-primary,currentColor)">${p.text}</blockquote>` },
    { id: 'divider', label: n.divider, category: l.categories.basic, content: '<hr style="border:0;border-top:1px solid var(--color-line,currentColor);opacity:0.4">' },
    { id: 'spacer', label: n.spacer, category: l.categories.basic, content: '<div style="height:3rem"></div>' },
    { id: 'image', label: n.image, category: l.categories.media, activate: true, select: true, content: { type: 'image', style: { 'max-width': '100%', height: 'auto' } } },
    { id: 'video', label: n.video, category: l.categories.media, content: { type: 'video', style: { width: '100%', 'aspect-ratio': '16 / 9' } } },
  ];
}

const DUNCIT_BLOCKS = ['newsletter', 'reel-slider', 'earn-showcase', 'app-download', 'social-links', 'policy-strip'] as const;
const DUNCIT_NAME_KEY: Record<(typeof DUNCIT_BLOCKS)[number], string> = {
  newsletter: 'newsletter',
  'reel-slider': 'reelSlider',
  'earn-showcase': 'earnShowcase',
  'app-download': 'appDownload',
  'social-links': 'socialLinks',
  'policy-strip': 'policyStrip',
};

const ENTRY_FIELD_BLOCKS: [string, string][] = [
  ['entry-title', 'title'],
  ['entry-summary', 'summary'],
  ['entry-body', 'body_html'],
  ['entry-cover', 'cover_image'],
  ['entry-date', 'published_at'],
  ['entry-category', 'category'],
  ['entry-author', 'author_name'],
];
const ENTRY_NAME_KEY: Record<string, string> = {
  'entry-title': 'entryTitle',
  'entry-summary': 'entrySummary',
  'entry-body': 'entryBody',
  'entry-cover': 'entryCover',
  'entry-date': 'entryDate',
  'entry-category': 'entryCategory',
  'entry-author': 'entryAuthor',
};

/**
 * Every block, in panel order. Collection blocks appear only on a collection
 * template; a fragment can hold other SECTION fragments but not itself.
 */
export function registerBlocks(editor: Editor, labels: BlockLabels, fragments: FragmentPreview[], options: { template: boolean; selfKey?: string }) {
  const manager = editor.Blocks;
  for (const block of basicBlocks(labels)) manager.add(block.id, block);
  for (const block of DUNCIT_BLOCKS) {
    manager.add(`duncit-${block}`, {
      label: labels.names[DUNCIT_NAME_KEY[block]],
      category: labels.categories.duncit,
      content: `<cms-block data-block="${block}"></cms-block>`,
    });
  }
  for (const fragment of fragments.filter((f) => f.key !== options.selfKey)) {
    manager.add(`fragment-${fragment.key}`, {
      label: fragment.name,
      category: labels.categories.fragments,
      content: `<cms-fragment data-key="${fragment.key}"></cms-fragment>`,
    });
  }
  if (!options.template) return;
  manager.add('entry-list', {
    label: labels.names.entryList,
    category: labels.categories.collection,
    content: '<cms-entry-list data-variant="cards"></cms-entry-list>',
  });
  for (const [id, field] of ENTRY_FIELD_BLOCKS) {
    manager.add(id, { label: labels.names[ENTRY_NAME_KEY[id]], category: labels.categories.collection, content: `<cms-field data-field="${field}"></cms-field>` });
  }
}
