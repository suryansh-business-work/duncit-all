import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import PageForm from '../../src/pages/cms/pages-tab/page-form/page.form';
import PageSettingsDialog from '../../src/pages/cms/pages-tab/PageSettingsDialog';
import { useServerProblems } from '../../src/pages/cms/components/code-field/useServerProblems';
import { renderWithProviders } from '../testkit';
import { resetMonacoFakes } from '../mocks/monaco-editor';
import { SITE_DESIGN_TOKENS, makeCmsPageRow, makeCmsSeo, siteDesignMock } from '../mocks/cms.mock';

vi.mock('@monaco-editor/react', () => import('../mocks/monaco-editor'));
vi.mock('../../src/pages/cms/components/code-field/useServerProblems', () => ({
  useServerProblems: vi.fn(() => ({ problems: [], checking: false })),
}));
vi.mock('@duncit/media-picker', () => ({
  SingleImageUploadField: ({ label, helperText }: { label: string; helperText?: string }) => (
    <label>
      {label}
      <input aria-label={label} readOnly />
      <span>{helperText}</span>
    </label>
  ),
}));

const renderForm = (over: Partial<Omit<Parameters<typeof PageForm>[0], 'onSubmit' | 'onCancel'>> = {}) => {
  const props = { page: null, collections: [], submitting: false, errorMessage: null, ...over, onSubmit: vi.fn(), onCancel: vi.fn() };
  renderWithProviders(<PageForm {...props} />);
  return props;
};

const openAdvanced = () => fireEvent.click(screen.getByRole('button', { name: 'Search & code' }));

beforeEach(() => {
  resetMonacoFakes();
  vi.mocked(useServerProblems).mockClear();
});

describe('PageForm — sharing and page CSS', () => {
  it('lists the site variables beside the page CSS, which is checked as SCSS', () => {
    renderForm({ tokens: SITE_DESIGN_TOKENS, page: makeCmsPageRow({ custom_css: '.about { gap: 0; }' }) });
    openAdvanced();
    const pageCss = screen.getByTestId('cms-code-custom_css');
    expect(within(pageCss).getByRole('button', { name: 'Insert --brand' })).toBeInTheDocument();
    expect(screen.getAllByTestId('cms-code-tokens')).toHaveLength(1);
    expect(useServerProblems).toHaveBeenCalledWith('scss', '.about { gap: 0; }');
  });

  it('shows an empty variables list when the site has none', () => {
    renderForm();
    openAdvanced();
    expect(within(screen.getByTestId('cms-code-custom_css')).getByText(/no design variables yet/)).toBeInTheDocument();
  });

  it("loads the page's share card and saves the edited one", async () => {
    const page = makeCmsPageRow({ seo: makeCmsSeo({ og_title: 'About Duncit', twitter_card: 'summary' }) });
    const { onSubmit } = renderForm({ page });
    openAdvanced();
    expect(screen.getByRole('heading', { name: 'Sharing & meta tags' })).toBeInTheDocument();
    expect(screen.getByLabelText('Share title')).toHaveValue('About Duncit');
    fireEvent.change(screen.getByLabelText('Share title'), { target: { value: 'Who we are' } });
    fireEvent.click(screen.getByTestId('cms-page-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].seo_sharing).toMatchObject({ og_title: 'Who we are', twitter_card: 'summary' });
  });

  it('refuses to save structured data that is not JSON', async () => {
    const { onSubmit } = renderForm({ page: makeCmsPageRow() });
    openAdvanced();
    fireEvent.change(screen.getByLabelText('Structured data (JSON-LD)'), { target: { value: '{"@type": Organization}' } });
    fireEvent.click(screen.getByTestId('cms-page-save'));
    expect(await screen.findByText('Structured data must be valid JSON.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('PageForm — templates and the share image', () => {
  it('shows the collection picker, not an address, for a collection template', () => {
    renderForm({ page: makeCmsPageRow({ kind: 'COLLECTION_LIST', collection_type: 'BLOG', path: '' }), collections: ['BLOG'] });
    expect(screen.getByRole('combobox', { name: 'Collection' })).toHaveTextContent('Blog');
    expect(screen.queryByLabelText(/^Address/)).not.toBeInTheDocument();
  });

  it('flags a share image that is not an https link', async () => {
    const { onSubmit } = renderForm({ page: makeCmsPageRow({ seo: makeCmsSeo({ og_image_url: 'http://cdn.example.com/og.png' }) }) });
    openAdvanced();
    fireEvent.click(screen.getByTestId('cms-page-save'));
    expect(await screen.findByText(/Use an https link/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('PageSettingsDialog — site variables', () => {
  it("hands the page form the site's variables", async () => {
    renderWithProviders(<PageSettingsDialog siteId="site-1" collections={[]} state={{ page: null }} onClose={vi.fn()} onSaved={vi.fn()} />, {
      mocks: [siteDesignMock()],
    });
    openAdvanced();
    const pageCss = screen.getByTestId('cms-code-custom_css');
    expect(await within(pageCss).findByRole('button', { name: 'Insert --font-heading' })).toBeInTheDocument();
    expect(within(pageCss).getByRole('button', { name: 'Insert --brand' })).toBeInTheDocument();
  });
});
