import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { CmsCodeProblem } from '@duncit/gql-types';
import { renderWithProviders } from '../testkit';
import { monacoHost, resetMonacoFakes } from '../mocks/monaco-editor';
import { CodeFieldHarness } from '../mocks/code-field-harness';
import { useServerProblems } from '../../src/pages/cms/components/code-field/useServerProblems';

vi.mock('@monaco-editor/react', () => import('../mocks/monaco-editor'));
vi.mock('../../src/pages/cms/components/code-field/useServerProblems', () => ({
  useServerProblems: vi.fn(() => ({ problems: [], checking: false })),
}));

const problem = (line: number, message: string, severity: CmsCodeProblem['severity'] = 'ERROR', column = 1): CmsCodeProblem => ({
  line,
  column,
  message,
  severity,
});

const serverSays = (problems: CmsCodeProblem[], checking = false) => vi.mocked(useServerProblems).mockReturnValue({ problems, checking });

beforeEach(() => {
  resetMonacoFakes();
  serverSays([]);
});

describe('CodeField — server problems', () => {
  it('reports zero errors and shows the hint when the code is clean', () => {
    const onProblemsChange = vi.fn();
    renderWithProviders(<CodeFieldHarness onProblemsChange={onProblemsChange} />);
    expect(onProblemsChange).toHaveBeenLastCalledWith(0);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(monacoHost.fakes.monaco.editor.setModelMarkers).toHaveBeenCalledWith(monacoHost.fakes.model, 'cms', []);
  });

  it('lists the problems under the editor and counts only errors for the form', () => {
    const onProblemsChange = vi.fn();
    serverSays([problem(1, 'expected "}"'), problem(2, 'unknown property', 'WARNING'), problem(3, 'unclosed block')]);
    renderWithProviders(<CodeFieldHarness onProblemsChange={onProblemsChange} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('3 error(s): line 1: expected "}" · line 2: unknown property · line 3: unclosed block');
    expect(alert).toHaveClass('Mui-error');
    expect(onProblemsChange).toHaveBeenLastCalledWith(2);
  });

  it('lists only the first five problems but counts them all', () => {
    serverSays(Array.from({ length: 7 }, (_, index) => problem(index + 1, `bad ${index + 1}`)));
    renderWithProviders(<CodeFieldHarness />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/^7 error\(s\):/);
    expect(alert).toHaveTextContent('line 5: bad 5');
    expect(alert).not.toHaveTextContent('line 6: bad 6');
  });

  it('lists warnings without marking the field as failed', () => {
    const onProblemsChange = vi.fn();
    serverSays([problem(1, 'deprecated', 'WARNING')]);
    renderWithProviders(<CodeFieldHarness onProblemsChange={onProblemsChange} />);
    expect(screen.getByRole('alert')).not.toHaveClass('Mui-error');
    expect(onProblemsChange).toHaveBeenLastCalledWith(0);
  });

  it('paints each problem on its line, clamping lines past the end of the code', () => {
    serverSays([problem(2, 'expected ";"', 'ERROR', 7), problem(9, 'unexpected end', 'WARNING', 1)]);
    renderWithProviders(<CodeFieldHarness />);
    const { monaco, model } = monacoHost.fakes;
    expect(monaco.editor.setModelMarkers).toHaveBeenLastCalledWith(model, 'cms', [
      { startLineNumber: 2, startColumn: 7, endLineNumber: 2, endColumn: 21, message: 'expected ";"', severity: monaco.MarkerSeverity.Error },
      { startLineNumber: 9, startColumn: 1, endLineNumber: 9, endColumn: 31, message: 'unexpected end', severity: monaco.MarkerSeverity.Warning },
    ]);
    expect(model.getLineMaxColumn).toHaveBeenLastCalledWith(3);
  });

  it('paints nothing while the editor has no model', () => {
    monacoHost.fakes.editor.getModel.mockReturnValue(null);
    serverSays([problem(1, 'x')]);
    renderWithProviders(<CodeFieldHarness />);
    expect(monacoHost.fakes.monaco.editor.setModelMarkers).not.toHaveBeenCalled();
  });

  it('paints nothing before the editor has mounted', () => {
    monacoHost.fakes.mount = false;
    serverSays([problem(1, 'x')]);
    renderWithProviders(<CodeFieldHarness />);
    expect(monacoHost.fakes.monaco.editor.setModelMarkers).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('line 1: x');
  });

  it('shows a progress bar while the server is checking', () => {
    serverSays([], true);
    renderWithProviders(<CodeFieldHarness />);
    expect(screen.getByRole('progressbar', { name: 'Checking the code' })).toBeInTheDocument();
  });

  it('shows no progress bar once the check is done', () => {
    renderWithProviders(<CodeFieldHarness />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
