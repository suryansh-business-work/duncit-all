import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Editor } from 'grapesjs';
import type { CmsDesignFont } from '@duncit/brand/cms-design';
import { snapshot, useGrapesEditor, type AssetRequest, type EditorSource } from '../../src/pages/cms/editor/useGrapesEditor';
import { useEditorLabels } from '../../src/pages/cms/editor/useEditorLabels';
import type { FragmentPreview } from '../../src/pages/cms/editor/editorComponents';
import { flush } from '../testkit';

/** The parts of the GrapesJS config these tests read back. */
interface AssetProps {
  select: (asset: unknown, complete: boolean) => void;
  close: () => void;
}
interface InitConfig {
  container: HTMLElement;
  projectData?: unknown;
  components?: string;
  style?: string;
  canvas: { styles: string[] };
  assetManager: { custom: { open: (props: AssetProps) => void; close: () => void } };
  plugins: ((ed: Editor) => void)[];
  [key: string]: unknown;
}

const grapes = vi.hoisted(() => ({ init: vi.fn() }));
// GrapesJS needs a real browser canvas; the hook's wiring around it is under test.
vi.mock('grapesjs', () => ({ default: { init: grapes.init } }));
vi.mock('grapesjs/dist/css/grapes.min.css', () => ({}));

const INTER: CmsDesignFont = { family: 'Inter', source: 'GOOGLE', weights: [400], italic: false, role: 'HEADING', variable: '', fallback: '', files: [] };
const FRAGMENTS: FragmentPreview[] = [
  { id: 'f1', key: 'hero', name: 'Hero', html: '<section>Hero</section>' },
  { id: 'f2', key: 'cta', name: 'Call to action', html: '<a>Go</a>' },
];

/** A select property in the Style Manager, as GrapesJS hands it out. */
const selectProperty = (options: { id: string; label: string }[]) => ({ getType: () => 'select', getOptions: () => options, setOptions: vi.fn() });

/** A stand-in GrapesJS editor: records listeners and lets a test say when the canvas is ready. */
function fakeCanvas({ doc = document.implementation.createHTMLDocument('canvas'), fontProperty, clearDirty = true }: { doc?: Document | null; fontProperty?: unknown; clearDirty?: boolean } = {}) {
  const handlers = new Map<string, () => void>();
  let ready: () => void = () => undefined;
  const editor = {
    Canvas: { getDocument: () => doc },
    StyleManager: { getProperty: vi.fn(() => fontProperty) },
    Assets: { add: vi.fn<(asset: unknown) => unknown>() },
    onReady: (callback: () => void) => {
      ready = callback;
    },
    on: (event: string, callback: () => void) => handlers.set(event, callback),
    getDirtyCount: vi.fn(() => 0),
    destroy: vi.fn(),
    ...(clearDirty ? { clearDirtyCount: vi.fn() } : {}),
  };
  return { editor, doc, ready: () => ready(), emit: (event: string) => handlers.get(event)?.() };
}

let config: InitConfig | undefined;
const built = () => {
  if (!config) throw new Error('GrapesJS was not initialised');
  return config;
};

const useLabels = () => renderHook(() => useEditorLabels()).result.current;

function mountEditor(over: Partial<Parameters<typeof useGrapesEditor>[0]> = {}, canvas = fakeCanvas()) {
  grapes.init.mockImplementation((cfg: InitConfig) => {
    config = cfg;
    return canvas.editor;
  });
  const source: EditorSource = { project: JSON.stringify({ pages: [{ id: 'home' }] }), html: '<p>Hi</p>', css: 'p{color:red}' };
  const initialProps: Parameters<typeof useGrapesEditor>[0] = {
    host: document.createElement('div'),
    source,
    canvasCss: ':root{--brand:#f60}',
    fontUrls: ['https://fonts.test/inter.css'],
    fonts: [INTER],
    fragments: FRAGMENTS,
    labels: useLabels(),
    template: true,
    selfKey: 'hero',
    onPickAsset: vi.fn(),
    onOpenFragment: vi.fn(),
    blockUrl: () => null,
    ...over,
  };
  const hook = renderHook((props: Parameters<typeof useGrapesEditor>[0]) => useGrapesEditor(props), { initialProps });
  return { ...hook, canvas, initialProps };
}

const mountReady = async (over: Partial<Parameters<typeof useGrapesEditor>[0]> = {}, canvas = fakeCanvas()) => {
  const mounted = mountEditor(over, canvas);
  await waitFor(() => expect(mounted.result.current.editor).toBe(canvas.editor));
  return mounted;
};

beforeEach(() => {
  grapes.init.mockReset();
  config = undefined;
});

describe('useGrapesEditor — building', () => {
  it('waits for both the canvas host and the document', async () => {
    const noHost = mountEditor({ host: null });
    const noDoc = mountEditor({ source: null });
    await act(flush);
    expect(grapes.init).not.toHaveBeenCalled();
    expect(noHost.result.current).toMatchObject({ editor: null, error: null, dirty: false });
    expect(noDoc.result.current.editor).toBeNull();
  });

  it("opens the saved project, painting the site's fonts and keeping GrapesJS's own css and scripts out", async () => {
    const { initialProps } = await mountReady();
    expect(built()).toMatchObject({
      container: initialProps.host,
      height: '100%',
      width: 'auto',
      storageManager: false,
      protectedCss: '',
      projectData: { pages: [{ id: 'home' }] },
      canvas: { styles: ['https://fonts.test/inter.css'] },
      parser: { optionsHtml: { allowScripts: false } },
    });
    expect(built().components).toBeUndefined();
  });

  it('opens the html and css when there is no project yet, or the saved one is unreadable', async () => {
    await mountReady({ source: { project: '', html: '<p>New</p>', css: 'p{}' } });
    expect(built()).toMatchObject({ components: '<p>New</p>', style: 'p{}' });
    expect(built().projectData).toBeUndefined();

    await mountReady({ source: { project: '{not json', html: '<p>Migrated</p>', css: '' } });
    expect(built()).toMatchObject({ components: '<p>Migrated</p>', style: '' });
    expect(built().projectData).toBeUndefined();
  });

  it('reports why GrapesJS could not start', async () => {
    grapes.init.mockImplementation(() => {
      throw new Error('Canvas unavailable');
    });
    const args = { ...mountArgs(), source: { project: '', html: '', css: '' } };
    const failed = renderHook(() => useGrapesEditor(args));
    await waitFor(() => expect(failed.result.current.error).toBe('Canvas unavailable'));
    expect(failed.result.current.editor).toBeNull();

    grapes.init.mockImplementation(() => {
      // A library throwing something that is not an Error still gets reported.
      throw 'plain failure';
    });
    const thrownArgs = { ...mountArgs(), source: { project: '', html: '', css: '' } };
    const thrown = renderHook(() => useGrapesEditor(thrownArgs));
    await waitFor(() => expect(thrown.result.current.error).toBe('plain failure'));
  });

  it('destroys the editor when the document closes, and builds nothing if it closes while GrapesJS loads', async () => {
    const { unmount, canvas } = await mountReady();
    unmount();
    expect(canvas.editor.destroy).toHaveBeenCalledTimes(1);

    grapes.init.mockClear();
    const early = mountEditor();
    early.unmount();
    await act(flush);
    expect(grapes.init).not.toHaveBeenCalled();
  });
});

/** Plain arguments for a hook rendered without mountEditor. */
function mountArgs(): Parameters<typeof useGrapesEditor>[0] {
  return {
    host: document.createElement('div'),
    source: null,
    canvasCss: '',
    fontUrls: [],
    fonts: [],
    fragments: [],
    labels: useLabels(),
    template: false,
    onPickAsset: vi.fn(),
    onOpenFragment: vi.fn(),
    blockUrl: () => null,
  };
}

describe('useGrapesEditor — the canvas once ready', () => {
  it("paints the latest design css first, offers the site's fonts first, and starts clean", async () => {
    const fontProperty = selectProperty([
      { id: 'Arial, Helvetica, sans-serif', label: 'Arial' },
      { id: '"Inter", sans-serif', label: 'Inter (default list)' },
    ]);
    const canvas = fakeCanvas({ fontProperty });
    const { rerender, initialProps } = await mountReady({}, canvas);
    rerender({ ...initialProps, canvasCss: ':root{--brand:#0a0}' });
    canvas.doc?.head.append(canvas.doc.createElement('meta'));

    act(() => canvas.ready());

    const first = canvas.doc?.head.firstElementChild;
    expect(first?.tagName).toBe('STYLE');
    expect(first?.getAttribute('data-cms-design')).toBe('true');
    expect(first?.textContent).toBe(':root{--brand:#0a0}');
    expect(canvas.editor.StyleManager.getProperty).toHaveBeenCalledWith('typography', 'font-family');
    expect(fontProperty.setOptions).toHaveBeenCalledWith([
      { id: '"Inter", sans-serif', label: 'Inter' },
      { id: 'Arial, Helvetica, sans-serif', label: 'Arial' },
    ]);
    expect(canvas.editor.clearDirtyCount).toHaveBeenCalledTimes(1);
  });

  it('marks the work unsaved after an edit, and saved again on markSaved', async () => {
    const canvas = fakeCanvas();
    const { result } = await mountReady({}, canvas);
    act(() => canvas.ready());
    expect(result.current.dirty).toBe(false);

    canvas.editor.getDirtyCount.mockReturnValue(3);
    act(() => canvas.emit('update'));
    expect(result.current.dirty).toBe(true);

    act(() => result.current.markSaved());
    expect(result.current.dirty).toBe(false);
    expect(canvas.editor.clearDirtyCount).toHaveBeenCalledTimes(2);
  });

  it('still tracks edits on a GrapesJS without clearDirtyCount', async () => {
    const canvas = fakeCanvas({ clearDirty: false });
    const { result } = await mountReady({}, canvas);
    act(() => canvas.ready());
    canvas.editor.getDirtyCount.mockReturnValue(1);
    act(() => canvas.emit('update'));
    expect(result.current.dirty).toBe(true);
    act(() => result.current.markSaved());
    expect(result.current.dirty).toBe(false);
  });

  it('leaves the font list alone without site fonts or a select font property', async () => {
    const noFonts = selectProperty([]);
    const empty = fakeCanvas({ fontProperty: noFonts });
    await mountReady({ fonts: [] }, empty);
    act(() => empty.ready());
    expect(noFonts.setOptions).not.toHaveBeenCalled();

    const custom = { getType: () => 'text', setOptions: vi.fn() };
    const textProperty = fakeCanvas({ fontProperty: custom });
    await mountReady({}, textProperty);
    act(() => textProperty.ready());
    expect(custom.setOptions).not.toHaveBeenCalled();

    const missing = fakeCanvas({ fontProperty: undefined });
    await mountReady({}, missing);
    act(() => missing.ready());
    expect(missing.doc?.head.querySelector('style[data-cms-design]')).not.toBeNull();
  });

  it('does nothing when the canvas has no document, and an edit before ready is not tracked', async () => {
    const canvas = fakeCanvas({ doc: null });
    const { result } = await mountReady({}, canvas);
    act(() => canvas.ready());
    canvas.editor.getDirtyCount.mockReturnValue(5);
    act(() => canvas.emit('update'));
    expect(canvas.editor.StyleManager.getProperty).not.toHaveBeenCalled();
    expect(canvas.editor.clearDirtyCount).not.toHaveBeenCalled();
    expect(result.current.dirty).toBe(false);
  });

  it('markSaved before the editor exists only resets the flag', () => {
    const { result } = mountEditor({ host: null });
    act(() => result.current.markSaved());
    expect(result.current.dirty).toBe(false);
  });
});

describe("useGrapesEditor — GrapesJS asks for an image", () => {
  const openPicker = async (added: unknown) => {
    const onPickAsset = vi.fn<(request: AssetRequest) => void>();
    const canvas = fakeCanvas();
    canvas.editor.Assets.add.mockReturnValue(added);
    await mountReady({ onPickAsset }, canvas);
    const props: AssetProps = { select: vi.fn(), close: vi.fn() };
    built().assetManager.custom.open(props);
    expect(onPickAsset).toHaveBeenCalledTimes(1);
    const [request] = onPickAsset.mock.calls[0];
    request.select('https://ik.test/photo.png');
    expect(canvas.editor.Assets.add).toHaveBeenCalledWith({ src: 'https://ik.test/photo.png', type: 'image' });
    return props;
  };

  it("answers with the console's picker and selects the picked image from the editor's library", async () => {
    const asset = { id: 'a1' };
    const props = await openPicker([asset]);
    expect(props.select).toHaveBeenCalledWith(asset, true);
    expect(props.close).toHaveBeenCalledTimes(1);
  });

  it('selects the image when the library hands back a single asset', async () => {
    const asset = { id: 'a2' };
    const props = await openPicker(asset);
    expect(props.select).toHaveBeenCalledWith(asset, true);
  });

  it('closes without selecting when the library could not add the image', async () => {
    const props = await openPicker(undefined);
    expect(props.select).not.toHaveBeenCalled();
    expect(props.close).toHaveBeenCalledTimes(1);
  });

  it("leaves closing to the console's own picker", async () => {
    const onPickAsset = vi.fn();
    await mountReady({ onPickAsset });
    expect(built().assetManager.custom.close()).toBeUndefined();
    expect(onPickAsset).not.toHaveBeenCalled();
  });
});

describe('useGrapesEditor — plugins', () => {
  it('registers the CMS elements, opening a placed component through the latest callback', async () => {
    const { rerender, initialProps } = await mountReady();
    const latest = vi.fn();
    rerender({ ...initialProps, onOpenFragment: latest });

    const types = new Map<string, { model: { defaults: { traits: { command?: (ed: Editor) => void }[] } } }>();
    const recordTypes = { DomComponents: { addType: (name: string, def: { model: { defaults: { traits: { command?: (ed: Editor) => void }[] } } }) => types.set(name, def) } };
    built().plugins[0](recordTypes as unknown as Editor);
    expect([...types.keys()]).toEqual(['cms-block', 'cms-fragment', 'cms-field', 'cms-entry-list']);

    const open = types.get('cms-fragment')?.model.defaults.traits[1].command;
    open?.({ getSelected: () => ({ getAttributes: () => ({ 'data-key': 'cta' }) }) } as unknown as Editor);
    expect(latest).toHaveBeenCalledWith(FRAGMENTS[1]);
    expect(initialProps.onOpenFragment).not.toHaveBeenCalled();
  });

  it("registers the block library for this document: no block of itself, the collection blocks on a template", async () => {
    await mountReady();
    const ids: string[] = [];
    built().plugins[1]({ Blocks: { add: (id: string) => ids.push(id) } } as unknown as Editor);
    expect(ids).toContain('fragment-cta');
    expect(ids).not.toContain('fragment-hero');
    expect(ids).toContain('entry-list');
  });
});

describe('snapshot', () => {
  it("sends the project, the wrapper's inner html and the css without GrapesJS's protected rules", () => {
    const getCss = vi.fn(() => '.a{color:red}');
    const editor = { getProjectData: () => ({ pages: [] }), getWrapper: () => ({ getInnerHTML: () => '<main>x</main>' }), getCss } as unknown as Editor;
    expect(snapshot(editor)).toEqual({ project: '{"pages":[]}', html: '<main>x</main>', css: '.a{color:red}' });
    expect(getCss).toHaveBeenCalledWith({ avoidProtected: true });
  });

  it('sends empty html and css when the editor has neither', () => {
    const editor = { getProjectData: () => ({}), getWrapper: () => undefined, getCss: () => undefined } as unknown as Editor;
    expect(snapshot(editor)).toEqual({ project: '{}', html: '', css: '' });
  });
});
