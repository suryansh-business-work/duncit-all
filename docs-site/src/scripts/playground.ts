/**
 * Monaco behind every code block on this site.
 *
 * Loaded by `code-actions.ts` with a dynamic import the first time somebody
 * presses Edit / Format / Tidy, so the ~4 MB editor never touches a reader who
 * only came to read. Monaco itself comes from the CDN through
 * `@monaco-editor/loader` — the same loader `@monaco-editor/react` uses in the
 * tech, crm and marketing portals, pinned to the same version, so the editor in
 * the docs behaves exactly like the one in the product.
 *
 * The editor is a scratchpad: it edits a COPY of the snippet and writes nothing
 * back. That is the whole reason Reset can be a one-liner.
 */
import loader, { type Monaco } from '@monaco-editor/loader';
import { isFormattable, monacoLanguage, tidy } from './languages';

type CodeEditor = ReturnType<Monaco['editor']['create']>;

/** Pinned to the Monaco the portals already ship (`@monaco-editor/react` resolves 0.55.1). */
const MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs';

export type PlaygroundAction = 'edit' | 'tidy' | 'format';

export interface OpenRequest {
  /** The snippet, exactly as it reads on the page. */
  code: string;
  /** Fence tag, e.g. `ts` — mapped to a Monaco language id. */
  fence: string;
  /** Which button was pressed; decides what runs the moment it opens. */
  action: PlaygroundAction;
  /** Shown in the dialog bar so a reader knows which block they are in. */
  title: string;
}

let monacoPromise: Promise<Monaco> | null = null;
let editor: CodeEditor | null = null;
let opened = '';

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`playground: #${id} is missing from the page`);
  return node as T;
}

/** A caught value is `unknown`; interpolating it raw prints `[object Object]`. */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : JSON.stringify(error);
}

function setStatus(message: string, tone: 'info' | 'error' = 'info'): void {
  const status = el('playground-status');
  status.textContent = message;
  status.dataset.tone = tone;
}

function monacoTheme(): string {
  return document.documentElement.dataset.theme === 'dark' ? 'vs-dark' : 'vs';
}

function ensureMonaco(): Promise<Monaco> {
  if (monacoPromise !== null) return monacoPromise;

  loader.config({ paths: { vs: MONACO_CDN } });
  monacoPromise = loader.init().then((monaco) => {
    /*
     * Every snippet in these docs is an excerpt — it imports from packages that
     * are not in this editor's file system, so diagnostics would underline
     * correct code in red. Formatting is what this editor is for and needs none
     * of them. The JSX option is what lets a `tsx` block parse at all.
     */
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowJs: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      target: monaco.languages.typescript.ScriptTarget.ESNext,
    });
    return monaco;
  });
  return monacoPromise;
}

function ensureEditor(monaco: Monaco): CodeEditor {
  if (editor) return editor;

  document.getElementById('playground-loading')?.remove();
  editor = monaco.editor.create(el('playground-editor'), {
    value: '',
    language: 'typescript',
    theme: monacoTheme(),
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13,
    tabSize: 2,
    wordWrap: 'off',
    padding: { top: 12, bottom: 12 },
  });
  return editor;
}

/** Monaco's formatters live in web workers; asking for one first means the
 * format action has a provider to call instead of resolving as a no-op. */
async function warmWorker(monaco: Monaco, language: string, model: ReturnType<CodeEditor['getModel']>): Promise<void> {
  if (!model) return;
  const ts = monaco.languages.typescript;
  if (language === 'typescript') {
    const getWorker = await ts.getTypeScriptWorker();
    await getWorker(model.uri);
  } else if (language === 'javascript') {
    const getWorker = await ts.getJavaScriptWorker();
    await getWorker(model.uri);
  }
}

async function runFormat(monaco: Monaco, code: CodeEditor): Promise<string> {
  const model = code.getModel();
  if (!model) return 'Nothing open to format.';

  const language = model.getLanguageId();
  if (!isFormattable(language)) {
    return `Monaco ships no ${language} formatter. Press Tidy for whitespace, or switch the language above.`;
  }

  await warmWorker(monaco, language, model);
  await code.getAction('editor.action.formatDocument')?.run();
  return `Formatted as ${language}.`;
}

function runTidy(code: CodeEditor): string {
  const model = code.getModel();
  if (!model) return 'Nothing open to tidy.';

  const current = model.getValue();
  const next = tidy(current);
  if (next === current) return 'Already tidy — nothing to change.';

  // An edit operation rather than setValue, so Ctrl+Z still walks back.
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text: next }], () => null);
  return 'Tidied: tabs to spaces, trailing whitespace and extra blank lines removed.';
}

function applyOnOpen(monaco: Monaco, code: CodeEditor, action: PlaygroundAction): Promise<string> {
  if (action === 'format') return runFormat(monaco, code);
  if (action === 'tidy') return Promise.resolve(runTidy(code));
  return Promise.resolve('Scratchpad — edits here are yours, the docs file is untouched.');
}

/**
 * Monaco comes off a CDN, so it can simply not arrive — a blocked network, an
 * offline laptop. The dialog is already open by then, and a permanent
 * "Loading…" would read as a hang, so the failure is said out loud and the
 * cached promise is dropped: pressing the button again is a real retry.
 */
async function loadMonaco(): Promise<Monaco | null> {
  try {
    return await ensureMonaco();
  } catch (error) {
    monacoPromise = null;
    setStatus(`The editor could not load: ${describe(error)}. It is fetched from a CDN — check the connection and try again.`, 'error');
    return null;
  }
}

/** Opens the dialog on the given snippet and runs whichever action asked for it. */
export async function openPlayground(request: OpenRequest): Promise<void> {
  const dialog = el<HTMLDialogElement>('code-playground');
  if (!dialog.open) dialog.showModal();
  setStatus('Loading the editor…');

  const monaco = await loadMonaco();
  if (!monaco) return;

  const code = ensureEditor(monaco);
  const language = monacoLanguage(request.fence);

  opened = request.code;
  el('playground-title').textContent = request.title;
  el<HTMLSelectElement>('playground-language').value = language;
  code.setValue(request.code);

  const model = code.getModel();
  if (model) monaco.editor.setModelLanguage(model, language);

  setStatus(await applyOnOpen(monaco, code, request.action));
  code.focus();
}

const BAR_ACTIONS: Record<string, (monaco: Monaco, code: CodeEditor, button: HTMLButtonElement) => Promise<string>> = {
  format: (monaco, code) => runFormat(monaco, code),
  tidy: (_monaco, code) => Promise.resolve(runTidy(code)),
  reset: (_monaco, code) => {
    code.setValue(opened);
    return Promise.resolve('Back to the snippet as the docs have it.');
  },
  copy: (_monaco, code) =>
    navigator.clipboard.writeText(code.getValue()).then(() => 'Copied the editor contents.'),
  wrap: (_monaco, code, button) => {
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on));
    code.updateOptions({ wordWrap: on ? 'on' : 'off' });
    return Promise.resolve(on ? 'Long lines wrap.' : 'Long lines scroll.');
  },
};

function onBarClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-playground-action]');
  if (!button) return;

  const id = button.dataset.playgroundAction ?? '';
  if (id === 'close') {
    el<HTMLDialogElement>('code-playground').close();
    return;
  }

  // Read into a local so the callback below has a narrowed, non-null editor
  // without an assertion — TypeScript cannot narrow a module-level `let` across
  // a closure boundary.
  const code = editor;
  const run = BAR_ACTIONS[id];
  if (!run || !code || monacoPromise === null) return;

  monacoPromise
    .then((monaco) => run(monaco, code, button))
    .then((message) => setStatus(message))
    .catch((error: unknown) => setStatus(describe(error), 'error'));
}

function onLanguageChange(event: Event): void {
  const model = editor?.getModel();
  if (!model || monacoPromise === null) return;

  const language = (event.target as HTMLSelectElement).value;
  monacoPromise
    .then((monaco) => {
      monaco.editor.setModelLanguage(model, language);
      setStatus(
        isFormattable(language)
          ? `Reading it as ${language} — Format is available.`
          : `Reading it as ${language} — no formatter for this one, Tidy still works.`,
      );
    })
    .catch((error: unknown) => setStatus(describe(error), 'error'));
}

/** Called once by `code-actions.ts` when it first imports this module. */
export function bindPlayground(): void {
  const dialog = el<HTMLDialogElement>('code-playground');
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
    else onBarClick(event);
  });
  el<HTMLSelectElement>('playground-language').addEventListener('change', onLanguageChange);

  globalThis.addEventListener('duncit-docs:theme', () => {
    monacoPromise?.then((monaco) => monaco.editor.setTheme(monacoTheme())).catch(() => setStatus('Theme sync failed.', 'error'));
  });
}
