import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ComponentCodeForm, type ComponentCodeValues } from '../../src/pages/cms/fragments-tab/component-code-form';
import { useServerProblems } from '../../src/pages/cms/components/code-field/useServerProblems';
import { renderWithProviders } from '../testkit';
import { resetMonacoFakes } from '../mocks/monaco-editor';

vi.mock('@monaco-editor/react', () => import('../mocks/monaco-editor'));
// The server's checks, played back: code containing BROKEN has one syntax error.
vi.mock('../../src/pages/cms/components/code-field/useServerProblems', () => ({
  useServerProblems: vi.fn((_language: string, source: string) => ({
    problems: source.includes('BROKEN') ? [{ line: 1, column: 1, message: 'Unexpected token', severity: 'ERROR' }] : [],
    checking: false,
  })),
}));

const values: ComponentCodeValues = { mode: 'html', html: '<section class="hero"></section>', scss: '.hero { gap: 1rem; }', js: '' };
const tokens = [{ name: '--brand', value: '#ff6600' }];

const renderForm = (over: Partial<Omit<Parameters<typeof ComponentCodeForm>[0], 'onSubmit' | 'onCancel'>> = {}) => {
  const props = { values, tokens, submitting: false, errorMessage: null, ...over, onSubmit: vi.fn(), onCancel: vi.fn() };
  renderWithProviders(<ComponentCodeForm {...props} />);
  return props;
};

const editor = (name: string) => screen.getByRole('textbox', { name });
const save = () => screen.getByTestId('cms-component-code-save');
/** The language the markup editor last asked the server to check in. */
const markupLanguage = () =>
  vi
    .mocked(useServerProblems)
    .mock.calls.filter(([, source]) => source.includes('<'))
    .at(-1)?.[0];

beforeEach(() => {
  resetMonacoFakes();
  vi.mocked(useServerProblems).mockClear();
});

describe('ComponentCodeForm', () => {
  it('opens on the saved code, in HTML mode, with the site variables beside the SCSS only', () => {
    renderForm();
    expect(editor('Markup')).toHaveValue(values.html);
    expect(editor('Component styles (SCSS)')).toHaveValue(values.scss);
    expect(editor('Component script')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'HTML' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(/checked by the Astro compiler/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Insert --brand' })).toHaveLength(1);
    expect(markupLanguage()).toBe('html');
  });

  it('switches the markup to Astro: explains it and has the Astro compiler check it', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Astro' }));
    expect(screen.getByRole('button', { name: 'Astro' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/checked by the Astro compiler/)).toBeInTheDocument();
    expect(markupLanguage()).toBe('astro');
  });

  it('keeps the current mode when the selected mode is clicked again', () => {
    renderForm({ values: { ...values, mode: 'astro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Astro' }));
    expect(screen.getByRole('button', { name: 'Astro' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/checked by the Astro compiler/)).toBeInTheDocument();
  });

  it('saves the edited code with its mode', async () => {
    const { onSubmit } = renderForm();
    fireEvent.change(editor('Component script'), { target: { value: 'root.hidden = false;' } });
    fireEvent.click(screen.getByRole('button', { name: 'Astro' }));
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ ...values, mode: 'astro', js: 'root.hidden = false;' });
  });

  it('refuses to save while any field has a syntax error, and allows it once fixed', async () => {
    const { onSubmit } = renderForm();
    fireEvent.change(editor('Component styles (SCSS)'), { target: { value: '.hero { BROKEN' } });
    expect(await screen.findByText(/Fix the code errors marked in red/)).toBeInTheDocument();
    expect(save()).toBeDisabled();
    fireEvent.change(editor('Component styles (SCSS)'), { target: { value: '.hero {}' } });
    await waitFor(() => expect(save()).toBeEnabled());
    expect(screen.queryByText(/Fix the code errors marked in red/)).not.toBeInTheDocument();
    fireEvent.click(save());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('shows why the last save failed', () => {
    renderForm({ errorMessage: 'Someone else saved this component.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Someone else saved this component.');
  });

  it('cancels without saving', () => {
    const { onCancel, onSubmit } = renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
