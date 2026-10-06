import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { notifyError } from '@duncit/dialogs';
import { renderWithProviders } from '../testkit';
import { monacoHost, resetMonacoFakes } from '../mocks/monaco-editor';
import { CodeFieldHarness } from '../mocks/code-field-harness';
import { useServerProblems } from '../../src/pages/cms/components/code-field/useServerProblems';

vi.mock('@monaco-editor/react', () => import('../mocks/monaco-editor'));
vi.mock('../../src/pages/cms/components/code-field/useServerProblems', () => ({
  useServerProblems: vi.fn(() => ({ problems: [], checking: false })),
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({ ...(await importOriginal<typeof import('@duncit/dialogs')>()), notifyError: vi.fn() }));

const editorBox = () => screen.getByRole('textbox', { name: 'Site CSS' });
const formatButton = () => screen.getByRole('button', { name: 'Format: Site CSS' });

beforeEach(() => {
  resetMonacoFakes();
  vi.mocked(notifyError).mockClear();
  vi.mocked(useServerProblems).mockClear();
});

describe('CodeField — the editor', () => {
  it.each([
    ['html', 'html'],
    ['astro', 'html'],
    ['scss', 'scss'],
    ['javascript', 'javascript'],
  ] as const)('highlights %s code as Monaco %s', (language, monacoLanguage) => {
    renderWithProviders(
      <ThemeProvider theme={createTheme({ palette: { mode: 'light' } })}>
        <CodeFieldHarness language={language} />
      </ThemeProvider>,
    );
    expect(editorBox()).toHaveAttribute('data-language', monacoLanguage);
    expect(editorBox()).toHaveAttribute('data-theme', 'light');
  });

  it('uses the dark editor theme in dark mode', () => {
    renderWithProviders(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <CodeFieldHarness />
      </ThemeProvider>,
    );
    expect(editorBox()).toHaveAttribute('data-theme', 'vs-dark');
  });

  it('is never shorter than six lines, and grows with minRows', () => {
    const { unmount } = renderWithProviders(<CodeFieldHarness minRows={2} />);
    expect(editorBox()).toHaveAttribute('data-height', String(8 * 19));
    unmount();
    renderWithProviders(<CodeFieldHarness minRows={14} />);
    expect(editorBox()).toHaveAttribute('data-height', String(16 * 19));
  });

  it('shows an empty editor for a field with no value and writes what is typed into the form', () => {
    const onValue = vi.fn();
    renderWithProviders(<CodeFieldHarness language="scss" onValue={onValue} />);
    expect(editorBox()).toHaveValue('');
    fireEvent.change(editorBox(), { target: { value: '.a { color: red; }' } });
    expect(onValue).toHaveBeenLastCalledWith('.a { color: red; }');
    expect(useServerProblems).toHaveBeenLastCalledWith('scss', '.a { color: red; }');
  });

  it('stores an empty string when the editor reports no value', () => {
    const onValue = vi.fn();
    renderWithProviders(<CodeFieldHarness initial={{ css: 'body{}' }} onValue={onValue} />);
    expect(editorBox()).toHaveValue('body{}');
    fireEvent.click(screen.getByRole('button', { name: 'clear Site CSS' }));
    expect(onValue).toHaveBeenLastCalledWith('');
    expect(editorBox()).toHaveValue('');
  });

  it('explains the editor under it, or shows the caller hint instead', () => {
    const { unmount } = renderWithProviders(<CodeFieldHarness />);
    expect(screen.getByText(/Format tidies the code/)).toBeInTheDocument();
    unmount();
    renderWithProviders(<CodeFieldHarness hint="Scoped to this component." />);
    expect(screen.getByText('Scoped to this component.')).toBeInTheDocument();
    expect(screen.queryByText(/Format tidies the code/)).not.toBeInTheDocument();
  });
});

describe('CodeField — Format', () => {
  it('runs Monaco\'s format action', async () => {
    const run = vi.fn(() => Promise.resolve());
    monacoHost.fakes.editor.getAction.mockReturnValue({ run });
    renderWithProviders(<CodeFieldHarness />);
    fireEvent.click(formatButton());
    expect(monacoHost.fakes.editor.getAction).toHaveBeenCalledWith('editor.action.formatDocument');
    expect(run).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('tells the editor when the code cannot be formatted', async () => {
    monacoHost.fakes.editor.getAction.mockReturnValue({ run: () => Promise.reject(new Error('parse error')) });
    renderWithProviders(<CodeFieldHarness />);
    fireEvent.click(formatButton());
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('This code could not be formatted.'));
  });

  it('does nothing when the language has no formatter', () => {
    monacoHost.fakes.editor.getAction.mockReturnValue(null);
    renderWithProviders(<CodeFieldHarness />);
    expect(() => fireEvent.click(formatButton())).not.toThrow();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('does nothing before the editor has mounted', () => {
    monacoHost.fakes.mount = false;
    renderWithProviders(<CodeFieldHarness />);
    fireEvent.click(formatButton());
    expect(monacoHost.fakes.editor.getAction).not.toHaveBeenCalled();
  });
});

describe('CodeField — site tokens', () => {
  const tokens = [
    { name: '--brand', value: '#ff6600' },
    { name: '--space-2', value: '8px' },
  ];

  it('lists no tokens panel when the field has none', () => {
    renderWithProviders(<CodeFieldHarness />);
    expect(screen.queryByTestId('cms-code-tokens')).not.toBeInTheDocument();
  });

  it('inserts var(--name) at the cursor and gives focus back to the editor', () => {
    renderWithProviders(<CodeFieldHarness tokens={tokens} />);
    fireEvent.click(screen.getByRole('button', { name: 'Insert --brand' }));
    const { editor } = monacoHost.fakes;
    expect(editor.executeEdits).toHaveBeenCalledWith('cms-tokens', [
      { range: { startLineNumber: 2, startColumn: 5 }, text: 'var(--brand)', forceMoveMarkers: true },
    ]);
    expect(editor.focus).toHaveBeenCalledTimes(1);
  });

  it('inserts nothing when the editor has no cursor yet', () => {
    monacoHost.fakes.editor.getSelection.mockReturnValue(null);
    renderWithProviders(<CodeFieldHarness tokens={tokens} />);
    fireEvent.click(screen.getByRole('button', { name: 'Insert --space-2' }));
    expect(monacoHost.fakes.editor.executeEdits).not.toHaveBeenCalled();
  });

  it('inserts nothing before the editor has mounted', () => {
    monacoHost.fakes.mount = false;
    renderWithProviders(<CodeFieldHarness tokens={tokens} />);
    fireEvent.click(screen.getByRole('button', { name: 'Insert --brand' }));
    expect(monacoHost.fakes.editor.getSelection).not.toHaveBeenCalled();
    expect(monacoHost.fakes.editor.executeEdits).not.toHaveBeenCalled();
  });
});
