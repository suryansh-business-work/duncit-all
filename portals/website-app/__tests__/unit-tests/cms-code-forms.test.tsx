import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import CodeForm from '../../src/pages/cms/code-tab/code-form/code.form';
import DesignForm from '../../src/pages/cms/design-tab/design-form/design.form';
import { useServerProblems } from '../../src/pages/cms/components/code-field/useServerProblems';
import { renderWithProviders } from '../testkit';
import { resetMonacoFakes } from '../mocks/monaco-editor';
import { makeSiteDesign } from '../mocks/cms.mock';

vi.mock('@monaco-editor/react', () => import('../mocks/monaco-editor'));
vi.mock('../../src/pages/cms/components/code-field/useServerProblems', () => ({
  useServerProblems: vi.fn((_language: string, source: string) => ({
    problems: source.includes('BROKEN') ? [{ line: 1, column: 1, message: 'expected "}"', severity: 'ERROR' }] : [],
    checking: false,
  })),
}));

const site = { ...makeSiteDesign(), custom_css: '.site { margin: 0; }' };
const design = { ...site.design, base_css: 'body { color: var(--brand); }' };

const field = (testId: string) => screen.getByTestId(testId);

beforeEach(() => {
  resetMonacoFakes();
  vi.mocked(useServerProblems).mockClear();
});

describe('CodeForm — site stylesheet', () => {
  it('lists the site variables beside the site CSS only, and checks it as SCSS', () => {
    renderWithProviders(<CodeForm site={site} submitting={false} errorMessage={null} onSubmit={vi.fn()} />);
    expect(within(field('cms-code-custom_css')).getByRole('button', { name: 'Insert --brand' })).toBeInTheDocument();
    expect(within(field('cms-code-custom_css')).getByRole('button', { name: 'Insert --font-heading' })).toBeInTheDocument();
    expect(screen.getAllByTestId('cms-code-tokens')).toHaveLength(1);
    expect(useServerProblems).toHaveBeenCalledWith('scss', '.site { margin: 0; }');
  });

  it('shows an empty variables list before the site has loaded, and why the last save failed', () => {
    renderWithProviders(<CodeForm site={null} submitting={false} errorMessage="Could not save the site code. Try again." onSubmit={vi.fn()} />);
    expect(screen.getByText('Could not save the site code. Try again.')).toBeInTheDocument();
    expect(screen.getByText('This site has no design variables yet. Add them in Design.')).toBeInTheDocument();
  });

  it('blocks saving SCSS the server cannot compile', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<CodeForm site={site} submitting={false} errorMessage={null} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Site CSS' }), { target: { value: '.site { BROKEN' } });
    await waitFor(() => expect(screen.getByTestId('cms-code-save')).toBeDisabled());
    expect(screen.getByText(/Fix the code errors marked in red/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('DesignForm — base stylesheet', () => {
  it('lists the design tokens and font variables beside the base CSS, checked as SCSS', () => {
    renderWithProviders(<DesignForm design={design} submitting={false} errorMessage={null} onSubmit={vi.fn()} />);
    const baseCss = field('cms-code-base_css');
    expect(within(baseCss).getByRole('button', { name: 'Insert --brand' })).toBeInTheDocument();
    expect(within(baseCss).getByRole('button', { name: 'Insert --font-heading' })).toBeInTheDocument();
    expect(useServerProblems).toHaveBeenCalledWith('scss', 'body { color: var(--brand); }');
  });

  it('shows no variables for a site without a design yet', () => {
    renderWithProviders(<DesignForm design={null} submitting={false} errorMessage={null} onSubmit={vi.fn()} />);
    expect(within(field('cms-code-base_css')).getByText('This site has no design variables yet. Add them in Design.')).toBeInTheDocument();
  });

  it('saves the base CSS as typed', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<DesignForm design={design} submitting={false} errorMessage={null} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Base stylesheet' }), { target: { value: 'h1 { font-family: var(--font-heading); }' } });
    fireEvent.click(screen.getByTestId('cms-design-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].base_css).toBe('h1 { font-family: var(--font-heading); }');
  });

  it('shows why the last save failed and refuses SCSS the server cannot compile', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<DesignForm design={design} submitting={false} errorMessage="Could not save the design." onSubmit={onSubmit} />);
    expect(screen.getByText('Could not save the design.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Base stylesheet' }), { target: { value: 'h1 { BROKEN' } });
    await waitFor(() => expect(screen.getByTestId('cms-design-save')).toBeDisabled());
    expect(screen.getByText(/Fix the code errors marked in red/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
