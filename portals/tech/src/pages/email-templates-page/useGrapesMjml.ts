import { useEffect, useRef, useState } from 'react';
import type { Editor } from 'grapesjs';

interface Args {
  /** The MJML the editor loads. Only read when the canvas is first built. */
  initialMjml: string;
  /** Fired for a real edit, never for the load that opened the canvas. */
  onChange: (mjml: string) => void;
  /** Where the canvas mounts. */
  host: HTMLDivElement | null;
}

interface Result {
  editor: Editor | null;
  loading: boolean;
  error: string | null;
}

/**
 * GrapesJS on the MJML plugin, loaded on demand.
 *
 * Two things here are deliberate.
 *
 * The import is dynamic: grapesjs plus mjml-browser is well over a megabyte,
 * and it is wanted by one pane of one page in this console. Everybody else
 * loading it on every visit to pay for that is the wrong trade, so it arrives
 * when the designer is opened and not before.
 *
 * And the FIRST render never calls back. GrapesJS normalises whatever it
 * parses, so a load that emitted would rewrite a template merely because
 * somebody looked at it in the designer — reindenting hand-written MJML and
 * touching every `{{ variable }}` it re-serialises. Nothing leaves this hook
 * until a person actually changes something on the canvas.
 */
export function useGrapesMjml({ initialMjml, onChange, host }: Args): Result {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Read through a ref so a new handler identity never rebuilds the canvas —
  // a rebuild loses the selection and the undo stack mid-edit.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialRef = useRef(initialMjml);
  initialRef.current = editor ? initialRef.current : initialMjml;

  useEffect(() => {
    if (!host) return undefined;
    let disposed = false;
    let built: Editor | null = null;

    const build = async () => {
      try {
        const [{ default: grapesjs }, { default: mjmlPlugin }] = await Promise.all([
          import('grapesjs'),
          import('grapesjs-mjml'),
        ]);
        // The pane can go away while the import is still in flight. This is
        // the only await between mounting and building, so checking once here
        // is enough: grapesjs.init is synchronous and nothing below can yield.
        if (disposed) return;
        const canvas = grapesjs.init({
          container: host,
          height: '100%',
          width: 'auto',
          storageManager: false,
          // The plugin swaps the whole component set for MJML's, so the canvas
          // edits the same language the template is stored in — no HTML round
          // trip, which MJML cannot be recovered from.
          plugins: [mjmlPlugin],
          components: initialRef.current,
        });
        built = canvas;
        // `update` covers a component added, moved, restyled or retyped. The
        // listener is attached AFTER init so the parse that built the canvas
        // is not itself reported as an edit.
        canvas.on('update', () => {
          onChangeRef.current(canvas.getHtml());
        });
        setEditor(canvas);
        setLoading(false);
      } catch (cause) {
        // A library that throws a bare string still has to name itself in the
        // message: "[object Object]" tells whoever is looking at it nothing.
        setError(cause instanceof Error ? cause.message : String(cause));
        setLoading(false);
      }
    };

    build();
    return () => {
      disposed = true;
      built?.destroy();
      setEditor(null);
    };
  }, [host]);

  return { editor, loading, error };
}
