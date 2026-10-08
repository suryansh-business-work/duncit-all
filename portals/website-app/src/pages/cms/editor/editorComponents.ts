import type { Component, Editor } from 'grapesjs';
import { mountBlockFrame, releaseBlockFrames, type BlockFrameUrl } from './blockFrame';

/**
 * The CMS's own elements in the GrapesJS canvas. Each serialises to the EXACT
 * markup the server and the website renderer parse —
 *
 *   <cms-block data-block="newsletter" data-props="{…}"></cms-block>
 *   <cms-fragment data-key="hero-cta"></cms-fragment>
 *   <cms-field data-field="title"></cms-field>
 *   <cms-entry-list data-variant="cards"></cms-entry-list>
 *
 * — so toHTML is overridden: GrapesJS would otherwise add an `id` to a
 * styled element and the strict patterns downstream would stop matching it.
 * In the canvas a live block is drawn by the site itself (blockFrame.ts), a
 * fragment as its real published markup and the rest as labelled stand-ins;
 * none of them can be edited from the inside.
 */

export interface EditorLabels {
  block: (name: string) => string;
  fragment: (name: string) => string;
  missingFragment: (key: string) => string;
  field: (name: string) => string;
  list: (variant: string) => string;
  /** The trait panel's label for one block prop. */
  prop: (key: string) => string;
  /** The button that opens a component placed in a page in its own editor. */
  openFragment: string;
  /** Shown in an empty block field: empty means the site's own default words. */
  defaultText: string;
}

export interface FragmentPreview {
  id: string;
  key: string;
  name: string;
  html: string;
}

const escapeAttr = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Props the trait panel edits for each block; the rest of `cmsProps` (a
 * migrated block's store list, policies…) is carried through untouched. */
export const BLOCK_TRAITS: Record<string, string[]> = {
  newsletter: ['source', 'heading', 'text', 'variant'],
  'earn-showcase': ['href', 'eyebrow', 'heading', 'headingMuted', 'text', 'cta'],
  'app-download': ['eyebrow', 'heading', 'text'],
  'social-links': ['heading'],
  'policy-strip': ['heading', 'baseUrl'],
  'reel-slider': ['eyebrow', 'heading'],
};

const parseProps = (raw: string | null): Record<string, unknown> => {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const standIn = (el: HTMLElement, text: string) => {
  el.textContent = text;
  el.setAttribute('contenteditable', 'false');
};

/** A block's props: the ones it was placed with, then what its traits say now. */
function blockProps(model: Component, block: string): Record<string, unknown> {
  const props: Record<string, unknown> = { ...(model.get('cmsProps') as Record<string, unknown> | undefined) };
  for (const key of BLOCK_TRAITS[block] ?? []) {
    const value = model.get(`prop_${key}`);
    if (typeof value === 'string' && value !== '') props[key] = value;
  }
  return props;
}

/** Every `<cms-block>` in a fragment's markup, drawn live where the site can draw it. */
function drawNestedBlocks(owner: HTMLElement, labels: EditorLabels, blockUrl: BlockFrameUrl) {
  for (const target of Array.from(owner.querySelectorAll<HTMLElement>('cms-block'))) {
    const block = target.dataset.block ?? '';
    const src = blockUrl(block, parseProps(target.dataset.props ?? null));
    if (src) mountBlockFrame(owner, target, src, labels.block(block));
  }
}

function blockHtml(model: Component): string {
  const block = String(model.getAttributes()['data-block'] ?? '');
  const props = blockProps(model, block);
  const json = Object.keys(props).length ? ` data-props="${escapeAttr(JSON.stringify(props))}"` : '';
  return `<cms-block data-block="${block}"${json}></cms-block>`;
}

function addBlockType(editor: Editor, labels: EditorLabels, blockUrl: BlockFrameUrl) {
  editor.DomComponents.addType('cms-block', {
    isComponent: (el) => {
      if (el.tagName !== 'CMS-BLOCK') return false;
      const cmsProps = parseProps(el.getAttribute('data-props'));
      const block = el.getAttribute('data-block') ?? '';
      const traitValues = Object.fromEntries((BLOCK_TRAITS[block] ?? []).map((key) => [`prop_${key}`, cmsProps[key] ?? '']));
      return { type: 'cms-block', cmsProps, ...traitValues };
    },
    model: {
      defaults: { tagName: 'cms-block', droppable: false, editable: false, cmsProps: {} },
      init(this: Component) {
        const block = String(this.getAttributes()['data-block'] ?? '');
        this.addTrait(
          (BLOCK_TRAITS[block] ?? []).map((key) => ({ type: 'text', name: `prop_${key}`, label: labels.prop(key), placeholder: labels.defaultText, changeProp: true })),
        );
      },
      toHTML(this: Component) {
        return blockHtml(this);
      },
    },
    view: {
      init() {
        // The stand-in shows the block's heading, so it follows the trait as it is typed.
        this.listenTo(this.model, 'change', this.render);
      },
      onRender({ el, model }) {
        releaseBlockFrames(el);
        const block = String(model.getAttributes()['data-block'] ?? '');
        const name = labels.block(block);
        const src = blockUrl(block, blockProps(model, block));
        if (src) {
          el.setAttribute('contenteditable', 'false');
          mountBlockFrame(el, el, src, name);
          return;
        }
        const heading = model.get('prop_heading');
        standIn(el, typeof heading === 'string' && heading ? `${name} · ${heading}` : name);
      },
      removed({ el }) {
        releaseBlockFrames(el);
      },
    },
  });
}

function addFragmentType(editor: Editor, labels: EditorLabels, fragments: FragmentPreview[], onOpen: (fragment: FragmentPreview) => void, blockUrl: BlockFrameUrl) {
  const byKey = new Map(fragments.map((f) => [f.key, f]));
  editor.DomComponents.addType('cms-fragment', {
    isComponent: (el) => el.tagName === 'CMS-FRAGMENT',
    model: {
      defaults: {
        tagName: 'cms-fragment',
        droppable: false,
        editable: false,
        traits: [
          { type: 'select', name: 'data-key', options: fragments.map((f) => ({ id: f.key, label: f.name })) },
          {
            type: 'button',
            name: 'open',
            text: labels.openFragment,
            full: true,
            command: (ed: Editor) => {
              const fragment = byKey.get(String(ed.getSelected()?.getAttributes()['data-key'] ?? ''));
              if (fragment) onOpen(fragment);
            },
          },
        ],
      },
      toHTML(this: Component) {
        return `<cms-fragment data-key="${String(this.getAttributes()['data-key'] ?? '')}"></cms-fragment>`;
      },
    },
    view: {
      init() {
        this.listenTo(this.model, 'change:attributes', this.render);
      },
      onRender({ el, model }) {
        releaseBlockFrames(el);
        const key = String(model.getAttributes()['data-key'] ?? '');
        const fragment = byKey.get(key);
        // A component is edited in its own editor: double-click opens it (a property, so re-renders replace it).
        el.ondblclick = fragment ? () => onOpen(fragment) : null;
        el.setAttribute('contenteditable', 'false');
        el.setAttribute('title', fragment ? labels.fragment(fragment.name) : labels.missingFragment(key));
        if (fragment?.html) {
          el.innerHTML = fragment.html;
          drawNestedBlocks(el, labels, blockUrl);
        } else standIn(el, labels.missingFragment(key));
      },
      removed({ el }) {
        releaseBlockFrames(el);
      },
    },
  });
}

function addFieldTypes(editor: Editor, labels: EditorLabels, fields: { id: string; label: string }[]) {
  editor.DomComponents.addType('cms-field', {
    isComponent: (el) => el.tagName === 'CMS-FIELD',
    model: {
      defaults: { tagName: 'cms-field', droppable: false, editable: false, traits: [{ type: 'select', name: 'data-field', options: fields }] },
      toHTML(this: Component) {
        return `<cms-field data-field="${String(this.getAttributes()['data-field'] ?? '')}"></cms-field>`;
      },
    },
    view: {
      init() {
        this.listenTo(this.model, 'change:attributes', this.render);
      },
      onRender({ el, model }) {
        const id = String(model.getAttributes()['data-field'] ?? '');
        standIn(el, labels.field(fields.find((f) => f.id === id)?.label ?? id));
      },
    },
  });
  editor.DomComponents.addType('cms-entry-list', {
    isComponent: (el) => el.tagName === 'CMS-ENTRY-LIST',
    model: {
      defaults: {
        tagName: 'cms-entry-list',
        droppable: false,
        editable: false,
        traits: [{ type: 'select', name: 'data-variant', options: ['cards', 'rows', 'compact'].map((v) => ({ id: v, label: v })) }],
      },
      toHTML(this: Component) {
        return `<cms-entry-list data-variant="${String(this.getAttributes()['data-variant'] ?? 'cards')}"></cms-entry-list>`;
      },
    },
    view: {
      init() {
        this.listenTo(this.model, 'change:attributes', this.render);
      },
      onRender({ el, model }) {
        standIn(el, labels.list(String(model.getAttributes()['data-variant'] ?? 'cards')));
      },
    },
  });
}

export function registerCmsComponents(
  editor: Editor,
  labels: EditorLabels,
  fragments: FragmentPreview[],
  fields: { id: string; label: string }[],
  onOpenFragment: (fragment: FragmentPreview) => void,
  blockUrl: BlockFrameUrl,
) {
  addBlockType(editor, labels, blockUrl);
  addFragmentType(editor, labels, fragments, onOpenFragment, blockUrl);
  addFieldTypes(editor, labels, fields);
}
