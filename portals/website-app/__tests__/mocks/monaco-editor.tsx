import { useEffect } from 'react';
import { vi } from 'vitest';

/**
 * A stand-in for `@monaco-editor/react`: Monaco needs a real browser (workers,
 * layout), so tests get a plain textarea that reports the props CodeField sets
 * and hands CodeField fake editor/monaco objects on mount — enough to assert
 * the markers it paints, the edits it makes and the actions it runs.
 */
const makeFakes = () => {
  const model = { getLineCount: vi.fn(() => 3), getLineMaxColumn: vi.fn((line: number) => line * 10 + 1) };
  const editor = {
    getModel: vi.fn<() => typeof model | null>(() => model),
    getSelection: vi.fn<() => { startLineNumber: number; startColumn: number } | null>(() => ({ startLineNumber: 2, startColumn: 5 })),
    executeEdits: vi.fn(),
    focus: vi.fn(),
    getAction: vi.fn<(id: string) => { run: () => Promise<void> } | null>(() => ({ run: () => Promise.resolve() })),
  };
  const monaco = { editor: { setModelMarkers: vi.fn() }, MarkerSeverity: { Error: 8, Warning: 4 } };
  return { mount: true, model, editor, monaco };
};

/** Reset in each test's beforeEach; read by the stub when it mounts. */
export const monacoHost = { fakes: makeFakes() };
export const resetMonacoFakes = () => {
  monacoHost.fakes = makeFakes();
};

interface StubProps {
  value: string;
  language: string;
  theme: string;
  height: number;
  onChange: (value: string | undefined) => void;
  onMount: (editor: unknown, monaco: unknown) => void;
  options: { ariaLabel: string };
}

export default function EditorStub({ value, language, theme, height, onChange, onMount, options }: Readonly<StubProps>) {
  useEffect(() => {
    const { fakes } = monacoHost;
    if (fakes.mount) onMount(fakes.editor, fakes.monaco);
  }, [onMount]);

  return (
    <>
      <textarea
        aria-label={options.ariaLabel}
        data-language={language}
        data-theme={theme}
        data-height={height}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="button" onClick={() => onChange(undefined)}>
        clear {options.ariaLabel}
      </button>
    </>
  );
}
