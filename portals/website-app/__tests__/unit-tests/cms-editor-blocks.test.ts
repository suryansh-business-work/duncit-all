import { describe, expect, it } from 'vitest';
import type { BlockProperties, Editor } from 'grapesjs';
import { registerBlocks, type BlockLabels } from '../../src/pages/cms/editor/editorBlocks';
import type { FragmentPreview } from '../../src/pages/cms/editor/editorComponents';

const NAMES = [
  'section', 'columns2', 'columns3', 'heading', 'text', 'button', 'link', 'image', 'video', 'divider', 'spacer', 'list', 'quote',
  'newsletter', 'reelSlider', 'earnShowcase', 'appDownload', 'socialLinks', 'policyStrip',
  'entryList', 'entryTitle', 'entrySummary', 'entryBody', 'entryCover', 'entryDate', 'entryCategory', 'entryAuthor',
];

const LABELS: BlockLabels = {
  categories: { basic: 'Basic', layout: 'Layout', media: 'Media', duncit: 'Duncit', fragments: 'Components', collection: 'Collection' },
  names: Object.fromEntries(NAMES.map((name) => [name, `name:${name}`])),
  placeholders: { text: 'Write here.', heading: 'A heading', button: 'Go' },
};

const FRAGMENTS: FragmentPreview[] = [
  { id: 'f1', key: 'hero', name: 'Hero', html: '<section>Hero</section>' },
  { id: 'f2', key: 'cta', name: 'Call to action', html: '<a>Go</a>' },
];

/** An editor whose block manager only records what was added, in order. */
function recordBlocks(fragments: FragmentPreview[], options: { template: boolean; selfKey?: string }) {
  const added: { id: string; block: BlockProperties }[] = [];
  const editor = { Blocks: { add: (id: string, block: BlockProperties) => added.push({ id, block }) } } as unknown as Editor;
  registerBlocks(editor, LABELS, fragments, options);
  return { ids: added.map((entry) => entry.id), byId: new Map(added.map((entry) => [entry.id, entry.block])) };
}

describe('registerBlocks', () => {
  it('lists the basic blocks, then the Duncit live blocks, then the published components', () => {
    const { ids } = recordBlocks(FRAGMENTS, { template: false });
    expect(ids).toEqual([
      'section', 'columns-2', 'columns-3', 'heading', 'text', 'button', 'link', 'list', 'quote', 'divider', 'spacer', 'image', 'video',
      'duncit-newsletter', 'duncit-reel-slider', 'duncit-earn-showcase', 'duncit-app-download', 'duncit-social-links', 'duncit-policy-strip',
      'fragment-hero', 'fragment-cta',
    ]);
  });

  it("files each basic block under its category, written with the site's tokens and the placeholder copy", () => {
    const { byId } = recordBlocks([], { template: false });
    expect(byId.get('section')).toMatchObject({ label: 'name:section', category: 'Layout' });
    expect(byId.get('section')?.content).toContain('<h2>A heading</h2><p>Write here.</p>');
    expect(byId.get('section')?.content).toContain('var(--space-section,4rem)');
    expect(byId.get('columns-3')?.content).toContain('minmax(min(100%,14rem),1fr)');
    expect(byId.get('heading')).toMatchObject({ category: 'Basic', content: '<h2>A heading</h2>' });
    expect(byId.get('text')?.content).toEqual({ type: 'text', content: 'Write here.' });
    expect(byId.get('button')?.content).toContain('var(--color-primary,ButtonFace)');
    expect(byId.get('button')?.content).toContain('>Go</a>');
    expect(byId.get('link')?.content).toEqual({ type: 'link', content: 'Go', attributes: { href: '#' } });
    expect(byId.get('image')).toMatchObject({ category: 'Media', activate: true, select: true, content: { type: 'image' } });
    expect(byId.get('video')).toMatchObject({ label: 'name:video', category: 'Media', content: { type: 'video' } });
  });

  it('places each live block as the bare <cms-block> the website renderer parses', () => {
    const { byId } = recordBlocks([], { template: false });
    expect(byId.get('duncit-reel-slider')).toEqual({ label: 'name:reelSlider', category: 'Duncit', content: '<cms-block data-block="reel-slider"></cms-block>' });
    expect(byId.get('duncit-policy-strip')).toEqual({ label: 'name:policyStrip', category: 'Duncit', content: '<cms-block data-block="policy-strip"></cms-block>' });
  });

  it('offers every published component by name, except the one being edited', () => {
    const { ids, byId } = recordBlocks(FRAGMENTS, { template: false, selfKey: 'hero' });
    expect(ids).not.toContain('fragment-hero');
    expect(byId.get('fragment-cta')).toEqual({ label: 'Call to action', category: 'Components', content: '<cms-fragment data-key="cta"></cms-fragment>' });
  });

  it('adds no collection blocks outside a collection template', () => {
    const { ids } = recordBlocks(FRAGMENTS, { template: false });
    expect(ids.filter((id) => id.startsWith('entry-'))).toEqual([]);
  });

  it('adds the entry list and one block per entry field on a collection template', () => {
    const { ids, byId } = recordBlocks([], { template: true });
    expect(ids.slice(-8)).toEqual(['entry-list', 'entry-title', 'entry-summary', 'entry-body', 'entry-cover', 'entry-date', 'entry-category', 'entry-author']);
    expect(byId.get('entry-list')).toEqual({ label: 'name:entryList', category: 'Collection', content: '<cms-entry-list data-variant="cards"></cms-entry-list>' });
    expect(byId.get('entry-body')).toEqual({ label: 'name:entryBody', category: 'Collection', content: '<cms-field data-field="body_html"></cms-field>' });
    expect(byId.get('entry-date')?.content).toBe('<cms-field data-field="published_at"></cms-field>');
    expect(byId.get('entry-author')?.content).toBe('<cms-field data-field="author_name"></cms-field>');
  });
});
