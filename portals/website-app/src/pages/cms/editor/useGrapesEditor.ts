import { useEffect, useRef, useState } from 'react';
import type { Editor, Property, PropertySelect } from 'grapesjs';
import { fontStack, type CmsDesignFont } from '@duncit/brand/cms-design';
import { registerCmsComponents, type EditorLabels, type FragmentPreview } from './editorComponents';
import { registerBlocks, type BlockLabels } from './editorBlocks';

export interface EditorSource {
  /** The editor's own JSON from the last save; empty for a page that has none yet. */
  project: string;
  /** Used when there is no project: a new page, or one migrated as html. */
  html: string;
  css: string;
}

export interface AssetRequest {
  select: (url: string) => void;
}

interface Args {
  host: HTMLDivElement | null;
  source: EditorSource | null;
  /** The site's design system as css, painted into the canvas only — never saved. */
  canvasCss: string;
  fontUrls: string[];
  /** The site's typefaces, offered first in the Style Manager's font list. */
  fonts: CmsDesignFont[];
  fragments: FragmentPreview[];
  labels: { components: EditorLabels; blocks: BlockLabels; fields: { id: string; label: string }[] };
  template: boolean;
  selfKey?: string;
  /** GrapesJS asked for an image; the console answers with its own picker. */
  onPickAsset: (request: AssetRequest) => void;
}

function parseProject(project: string): Record<string, unknown> | null {
  if (!project) return null;
  try {
    return JSON.parse(project) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * GrapesJS, loaded on demand (it is a large module wanted on one screen) and
 * built once per document. Built with the CMS components and blocks as plugins
 * so they exist BEFORE the content is parsed — a `<cms-block>` parsed earlier
 * would become a plain element and lose its strict markup.
 */
export function useGrapesEditor(args: Args) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const argsRef = useRef(args);
  argsRef.current = args;
  const { host, source } = args;

  useEffect(() => {
    if (!host || !source) return undefined;
    let disposed = false;
    let built: Editor | null = null;

    const build = async () => {
      const [{ default: grapesjs }] = await Promise.all([import('grapesjs'), import('grapesjs/dist/css/grapes.min.css')]);
      if (disposed) return;
      const a = argsRef.current;
      const project = parseProject(source.project);
      const canvas = grapesjs.init({
        container: host,
        height: '100%',
        width: 'auto',
        storageManager: false,
        // GrapesJS's own resets would otherwise ship to the live site in getCss().
        protectedCss: '',
        ...(project ? { projectData: project } : { components: source.html, style: source.css }),
        canvas: { styles: a.fontUrls },
        parser: { optionsHtml: { allowScripts: false } },
        assetManager: {
          custom: {
            open(props) {
              argsRef.current.onPickAsset({
                select: (url) => {
                  // Registered in the editor's own library, so it can be re-picked
                  // later without another upload.
                  const added = built?.Assets.add({ src: url, type: 'image' });
                  const asset = Array.isArray(added) ? added[0] : added;
                  if (asset) props.select(asset, true);
                  props.close();
                },
              });
            },
            close() {
              // The console's picker closes itself.
            },
          },
        },
        plugins: [
          (ed) => registerCmsComponents(ed, a.labels.components, a.fragments, a.labels.fields),
          (ed) => registerBlocks(ed, a.labels.blocks, a.fragments, { template: a.template, selfKey: a.selfKey }),
        ],
      });
      built = canvas;
      canvas.onReady(() => {
        const doc = canvas.Canvas.getDocument();
        if (!doc) return;
        const style = doc.createElement('style');
        style.dataset.cmsDesign = 'true';
        style.textContent = argsRef.current.canvasCss;
        doc.head.prepend(style);
        offerSiteFonts(canvas, argsRef.current.fonts);
        canvas.clearDirtyCount?.();
        // Attached after the load, so opening a page is not itself an edit.
        canvas.on('update', () => setDirty(canvas.getDirtyCount() > 0));
      });
      setEditor(canvas);
    };

    build().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
    return () => {
      disposed = true;
      built?.destroy();
      setEditor(null);
    };
  }, [host, source]);

  const markSaved = () => {
    editor?.clearDirtyCount?.();
    setDirty(false);
  };

  return { editor, error, dirty, markSaved };
}

/** font-family is a select property in the default Style Manager; a custom config could replace it. */
const isSelect = (property: Property | undefined): property is PropertySelect => property?.getType() === 'select';

/** Puts the site's own typefaces at the top of the Style Manager's font list. */
function offerSiteFonts(editor: Editor, fonts: CmsDesignFont[]) {
  const property = editor.StyleManager.getProperty('typography', 'font-family');
  if (!fonts.length || !isSelect(property)) return;
  const own = fonts.map((font) => ({ id: fontStack(font), label: font.family }));
  const known = new Set(own.map((option) => option.id));
  property.setOptions([...own, ...property.getOptions().filter((option) => !known.has(String(option.id)))]);
}

/** What a save sends: the project JSON and the html/css it renders to. The
 * wrapper's INNER html, so the live page never gets the editor's <body>. */
export function snapshot(editor: Editor) {
  return {
    project: JSON.stringify(editor.getProjectData()),
    html: editor.getWrapper()?.getInnerHTML() ?? '',
    css: editor.getCss({ avoidProtected: true }) ?? '',
  };
}
