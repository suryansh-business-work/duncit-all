import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Editor } from 'grapesjs';
import { BLOCK_TRAITS, registerCmsComponents, type EditorLabels, type FragmentPreview } from '../../src/pages/cms/editor/editorComponents';
import type { BlockFrameUrl } from '../../src/pages/cms/editor/blockFrame';

/** The slice of a GrapesJS type definition these tests drive. */
interface TypeDef {
  isComponent: (el: HTMLElement) => unknown;
  model: {
    defaults: { traits?: Record<string, unknown>[] } & Record<string, unknown>;
    init?: (this: unknown) => void;
    toHTML: (this: unknown) => string;
  };
  view: {
    init: (this: unknown) => void;
    onRender: (args: { el: HTMLElement; model: unknown }) => void;
    removed?: (args: { el: HTMLElement }) => void;
  };
}

const LABELS: EditorLabels = {
  block: (name) => `Live block: ${name}`,
  fragment: (name) => `Component: ${name}`,
  missingFragment: (key) => `Component "${key}" is not published yet`,
  field: (name) => `Entry field: ${name}`,
  list: (variant) => `Entries appear here (${variant})`,
  prop: (key) => `prop:${key}`,
  openFragment: 'Edit this component',
  defaultText: 'Empty uses the site default words',
};

const FIELDS = [
  { id: 'title', label: 'Entry title' },
  { id: 'summary', label: 'Entry summary' },
];

const FRAGMENTS: FragmentPreview[] = [
  { id: 'f1', key: 'hero', name: 'Hero', html: '<section><h1>Hero</h1><cms-block data-block="newsletter" data-props="{&quot;heading&quot;:&quot;Join&quot;}"></cms-block><cms-block></cms-block></section>' },
  { id: 'f2', key: 'empty', name: 'Empty one', html: '' },
];

/** A component as the definitions read it: its attributes and its props. */
const fakeModel = (attributes: Record<string, string>, props: Record<string, unknown> = {}) => ({
  getAttributes: () => attributes,
  get: (key: string) => props[key],
  addTrait: vi.fn(),
});

let types: Map<string, TypeDef>;
let onOpen: Mock<(fragment: FragmentPreview) => void>;
let blockUrl: Mock<BlockFrameUrl>;
const elements: HTMLElement[] = [];

function register(url: BlockFrameUrl = () => null) {
  types = new Map();
  onOpen = vi.fn<(fragment: FragmentPreview) => void>();
  blockUrl = vi.fn<BlockFrameUrl>(url);
  const editor = { DomComponents: { addType: (name: string, def: unknown) => types.set(name, def as TypeDef) } } as unknown as Editor;
  registerCmsComponents(editor, LABELS, FRAGMENTS, FIELDS, onOpen, blockUrl);
}

const typeOf = (name: string) => {
  const def = types.get(name);
  if (!def) throw new Error(`${name} was not registered`);
  return def;
};

/** An element in the page (frames need a window to post from). */
const element = (html: string) => {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  elements.push(host);
  const el = host.firstElementChild;
  if (!(el instanceof HTMLElement)) throw new Error('no element');
  return el;
};

beforeEach(() => register());

afterEach(() => {
  for (const host of elements.splice(0)) host.remove();
});

it('registers the four CMS element types', () => {
  expect([...types.keys()]).toEqual(['cms-block', 'cms-fragment', 'cms-field', 'cms-entry-list']);
});

describe('cms-block', () => {
  it('claims only <cms-block>, reading its props into the trait values', () => {
    const { isComponent } = typeOf('cms-block');
    expect(isComponent(element('<div data-block="newsletter"></div>'))).toBe(false);
    const el = element(`<cms-block data-block="newsletter" data-props='{"heading":"Join us","stores":["ios"]}'></cms-block>`);
    expect(isComponent(el)).toEqual({
      type: 'cms-block',
      cmsProps: { heading: 'Join us', stores: ['ios'] },
      prop_source: '',
      prop_heading: 'Join us',
      prop_text: '',
      prop_variant: '',
    });
  });

  it('reads broken, non-object or missing props as none, and a block without traits as having none', () => {
    const { isComponent } = typeOf('cms-block');
    expect(isComponent(element(`<cms-block data-block="social-links" data-props="{oops"></cms-block>`))).toEqual({ type: 'cms-block', cmsProps: {}, prop_heading: '' });
    expect(isComponent(element(`<cms-block data-block="social-links" data-props="null"></cms-block>`))).toEqual({ type: 'cms-block', cmsProps: {}, prop_heading: '' });
    expect(isComponent(element(`<cms-block data-block="social-links" data-props="7"></cms-block>`))).toEqual({ type: 'cms-block', cmsProps: {}, prop_heading: '' });
    expect(isComponent(element('<cms-block></cms-block>'))).toEqual({ type: 'cms-block', cmsProps: {} });
  });

  it('is not editable from the inside and gives each block its own trait fields', () => {
    const def = typeOf('cms-block');
    expect(def.model.defaults).toMatchObject({ tagName: 'cms-block', droppable: false, editable: false, cmsProps: {} });

    const model = fakeModel({ 'data-block': 'policy-strip' });
    def.model.init?.call(model);
    expect(model.addTrait).toHaveBeenCalledWith(
      BLOCK_TRAITS['policy-strip'].map((key) => ({ type: 'text', name: `prop_${key}`, label: `prop:${key}`, placeholder: LABELS.defaultText, changeProp: true })),
    );

    const unknown = fakeModel({});
    def.model.init?.call(unknown);
    expect(unknown.addTrait).toHaveBeenCalledWith([]);
  });

  it('serialises to the strict markup: placed props, then non-empty trait text, escaped', () => {
    const { toHTML } = typeOf('cms-block').model;
    const model = fakeModel(
      { 'data-block': 'newsletter', id: 'i3x' },
      { cmsProps: { stores: ['ios'], heading: 'Old' }, prop_heading: 'Tom & "Jerry" <3>', prop_text: '', prop_variant: 7 },
    );
    const json = JSON.stringify({ stores: ['ios'], heading: 'Tom & "Jerry" <3>' }).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    expect(toHTML.call(model)).toBe(`<cms-block data-block="newsletter" data-props="${json}"></cms-block>`);
  });

  it('leaves data-props off a block with no props', () => {
    const { toHTML } = typeOf('cms-block').model;
    expect(toHTML.call(fakeModel({ 'data-block': 'app-download' }, { prop_heading: '' }))).toBe('<cms-block data-block="app-download"></cms-block>');
    expect(toHTML.call(fakeModel({}))).toBe('<cms-block data-block=""></cms-block>');
  });

  it('re-renders whenever the component changes, so the stand-in follows the traits', () => {
    const listenTo = vi.fn();
    const view = { listenTo, model: {}, render: () => undefined };
    typeOf('cms-block').view.init.call(view);
    expect(listenTo).toHaveBeenCalledWith(view.model, 'change', view.render);
  });

  it('draws a stand-in with the heading when the site cannot draw the block', () => {
    const { onRender } = typeOf('cms-block').view;
    const el = element('<cms-block data-block="newsletter"></cms-block>');
    onRender({ el, model: fakeModel({ 'data-block': 'newsletter' }, { prop_heading: 'Join us' }) });
    expect(el.textContent).toBe('Live block: newsletter · Join us');
    expect(el.getAttribute('contenteditable')).toBe('false');
    expect(blockUrl).toHaveBeenCalledWith('newsletter', { heading: 'Join us' });

    onRender({ el, model: fakeModel({ 'data-block': 'newsletter' }, { prop_heading: '' }) });
    expect(el.textContent).toBe('Live block: newsletter');
    onRender({ el, model: fakeModel({}, { prop_heading: 42 }) });
    expect(el.textContent).toBe('Live block: ');
  });

  it('draws the block live as a frame when the site has a domain, and lets go of it once removed', () => {
    register((block, props) => `https://site.test/__block/${block}?props=${encodeURIComponent(JSON.stringify(props))}`);
    const { onRender, removed } = typeOf('cms-block').view;
    const el = element('<cms-block data-block="earn-showcase"></cms-block>');
    onRender({ el, model: fakeModel({ 'data-block': 'earn-showcase' }, { cmsProps: { href: '/earn' } }) });

    const frame = el.querySelector('iframe');
    expect(frame?.title).toBe('Live block: earn-showcase');
    expect(frame?.src).toBe(`https://site.test/__block/earn-showcase?props=${encodeURIComponent('{"href":"/earn"}')}`);
    expect(el.getAttribute('contenteditable')).toBe('false');
    expect(el.dataset.cmsLive).toBe('true');

    removed?.({ el });
    const win = document.defaultView;
    if (!win) throw new Error('jsdom has no window');
    const event = new win.MessageEvent('message', { data: { type: 'cms-block-height', height: 99 }, origin: 'https://site.test' });
    Object.defineProperty(event, 'source', { value: frame?.contentWindow });
    win.dispatchEvent(event);
    expect(frame?.style.height).toBe('20rem');
  });
});

describe('cms-fragment', () => {
  it('claims only <cms-fragment> and serialises to its key alone', () => {
    const def = typeOf('cms-fragment');
    expect(def.isComponent(element('<cms-fragment data-key="hero"></cms-fragment>'))).toBe(true);
    expect(def.isComponent(element('<section></section>'))).toBe(false);
    expect(def.model.toHTML.call(fakeModel({ 'data-key': 'hero', id: 'x1' }))).toBe('<cms-fragment data-key="hero"></cms-fragment>');
    expect(def.model.toHTML.call(fakeModel({}))).toBe('<cms-fragment data-key=""></cms-fragment>');
  });

  it('offers the published components to swap to, and an Edit button for the selected one', () => {
    const [select, button] = typeOf('cms-fragment').model.defaults.traits ?? [];
    expect(select).toEqual({ type: 'select', name: 'data-key', options: [{ id: 'hero', label: 'Hero' }, { id: 'empty', label: 'Empty one' }] });
    expect(button).toMatchObject({ type: 'button', name: 'open', text: 'Edit this component', full: true });

    const command = button.command as (ed: Editor) => void;
    const selecting = (selected: unknown) => ({ getSelected: () => selected }) as unknown as Editor;
    command(selecting(fakeModel({ 'data-key': 'hero' })));
    expect(onOpen).toHaveBeenCalledWith(FRAGMENTS[0]);

    onOpen.mockClear();
    command(selecting(fakeModel({ 'data-key': 'gone' })));
    command(selecting(undefined));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('re-renders when its attributes change (another component picked)', () => {
    const listenTo = vi.fn();
    const view = { listenTo, model: {}, render: () => undefined };
    typeOf('cms-fragment').view.init.call(view);
    expect(listenTo).toHaveBeenCalledWith(view.model, 'change:attributes', view.render);
  });

  it("shows a component's published markup, its live blocks drawn by the site, and opens it on double-click", () => {
    register((block) => (block ? `https://site.test/__block/${block}` : null));
    const { onRender } = typeOf('cms-fragment').view;
    const el = element('<cms-fragment data-key="hero"></cms-fragment>');
    onRender({ el, model: fakeModel({ 'data-key': 'hero' }) });

    expect(el.querySelector('h1')?.textContent).toBe('Hero');
    expect(el.getAttribute('title')).toBe('Component: Hero');
    expect(el.getAttribute('contenteditable')).toBe('false');
    expect(blockUrl).toHaveBeenCalledWith('newsletter', { heading: 'Join' });
    expect(blockUrl).toHaveBeenCalledWith('', {});
    const [live, bare] = Array.from(el.querySelectorAll('cms-block'));
    expect(live.querySelector('iframe')?.title).toBe('Live block: newsletter');
    // A block the site cannot draw stays the placeholder outline.
    expect(bare.querySelector('iframe')).toBeNull();

    el.dispatchEvent(new MouseEvent('dblclick'));
    expect(onOpen).toHaveBeenCalledWith(FRAGMENTS[0]);
    typeOf('cms-fragment').view.removed?.({ el });
  });

  it('marks a component that is not published, or has no markup, with a stand-in and nothing to open', () => {
    const { onRender } = typeOf('cms-fragment').view;
    const missing = element('<cms-fragment data-key="gone"></cms-fragment>');
    onRender({ el: missing, model: fakeModel({ 'data-key': 'gone' }) });
    expect(missing.textContent).toBe('Component "gone" is not published yet');
    expect(missing.getAttribute('title')).toBe('Component "gone" is not published yet');
    expect(missing.ondblclick).toBeNull();

    const blank = element('<cms-fragment data-key="empty"></cms-fragment>');
    onRender({ el: blank, model: fakeModel({ 'data-key': 'empty' }) });
    expect(blank.textContent).toBe('Component "empty" is not published yet');
    expect(blank.getAttribute('title')).toBe('Component: Empty one');

    const keyless = element('<cms-fragment></cms-fragment>');
    onRender({ el: keyless, model: fakeModel({}) });
    expect(keyless.textContent).toBe('Component "" is not published yet');
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe('cms-field', () => {
  it('claims only <cms-field>, serialises to its field and offers the entry fields', () => {
    const def = typeOf('cms-field');
    expect(def.isComponent(element('<cms-field data-field="title"></cms-field>'))).toBe(true);
    expect(def.isComponent(element('<span></span>'))).toBe(false);
    expect(def.model.defaults.traits).toEqual([{ type: 'select', name: 'data-field', options: FIELDS }]);
    expect(def.model.toHTML.call(fakeModel({ 'data-field': 'summary', id: 'q' }))).toBe('<cms-field data-field="summary"></cms-field>');
    expect(def.model.toHTML.call(fakeModel({}))).toBe('<cms-field data-field=""></cms-field>');
  });

  it("names the field by its label, or by its id when it is not a known field, and follows attribute changes", () => {
    const def = typeOf('cms-field');
    const el = element('<cms-field></cms-field>');
    def.view.onRender({ el, model: fakeModel({ 'data-field': 'title' }) });
    expect(el.textContent).toBe('Entry field: Entry title');
    expect(el.getAttribute('contenteditable')).toBe('false');
    def.view.onRender({ el, model: fakeModel({ 'data-field': 'legacy_field' }) });
    expect(el.textContent).toBe('Entry field: legacy_field');
    def.view.onRender({ el, model: fakeModel({}) });
    expect(el.textContent).toBe('Entry field: ');

    const listenTo = vi.fn();
    const view = { listenTo, model: {}, render: () => undefined };
    def.view.init.call(view);
    expect(listenTo).toHaveBeenCalledWith(view.model, 'change:attributes', view.render);
  });
});

describe('cms-entry-list', () => {
  it('claims only <cms-entry-list> and serialises to its variant, cards by default', () => {
    const def = typeOf('cms-entry-list');
    expect(def.isComponent(element('<cms-entry-list></cms-entry-list>'))).toBe(true);
    expect(def.isComponent(element('<ul></ul>'))).toBe(false);
    expect(def.model.defaults.traits).toEqual([
      { type: 'select', name: 'data-variant', options: [{ id: 'cards', label: 'cards' }, { id: 'rows', label: 'rows' }, { id: 'compact', label: 'compact' }] },
    ]);
    expect(def.model.toHTML.call(fakeModel({ 'data-variant': 'rows' }))).toBe('<cms-entry-list data-variant="rows"></cms-entry-list>');
    expect(def.model.toHTML.call(fakeModel({}))).toBe('<cms-entry-list data-variant="cards"></cms-entry-list>');
  });

  it('shows where the entries will appear, in which style, and follows attribute changes', () => {
    const def = typeOf('cms-entry-list');
    const el = element('<cms-entry-list></cms-entry-list>');
    def.view.onRender({ el, model: fakeModel({ 'data-variant': 'compact' }) });
    expect(el.textContent).toBe('Entries appear here (compact)');
    def.view.onRender({ el, model: fakeModel({}) });
    expect(el.textContent).toBe('Entries appear here (cards)');
    expect(el.getAttribute('contenteditable')).toBe('false');

    const listenTo = vi.fn();
    const view = { listenTo, model: {}, render: () => undefined };
    def.view.init.call(view);
    expect(listenTo).toHaveBeenCalledWith(view.model, 'change:attributes', view.render);
  });
});
