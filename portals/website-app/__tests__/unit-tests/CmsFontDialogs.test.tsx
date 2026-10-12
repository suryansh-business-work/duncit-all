import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import GoogleFontDialog from '../../src/pages/cms/design-tab/fonts/GoogleFontDialog';
import CustomFontDialog from '../../src/pages/cms/design-tab/fonts/CustomFontDialog';
import { CMS_GOOGLE_FONTS } from '../../src/pages/cms/queries/sites';
import { renderWithProviders } from '../testkit';
import { en, label } from '../en';
import { answerQuery, queryOptions, resetApollo } from '../hooks-mock';

const upload = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../hooks-mock')).hooks,
}));
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitDirectUpload: () => ({ upload, uploading: false }),
}));

const PAGE = {
  total: 2,
  categories: ['serif', 'display'],
  fonts: [
    { family: 'Lora', category: 'serif', weights: [400, 500, 700], italic: true, popularity: 1 },
    { family: 'Bebas Neue', category: 'display', weights: [400], italic: false, popularity: 2 },
  ],
};

beforeEach(() => {
  resetApollo();
  upload.mockReset();
  document.head.querySelectorAll('link[rel="stylesheet"]').forEach((link) => link.remove());
});

describe('GoogleFontDialog', () => {
  const mount = (onAdd = vi.fn(), onClose = vi.fn()) => {
    answerQuery(CMS_GOOGLE_FONTS, { data: { cmsGoogleFonts: PAGE } });
    renderWithProviders(<GoogleFontDialog open onClose={onClose} onAdd={onAdd} />);
    return { onAdd, onClose };
  };

  it('lists families written in themselves and loads each preview stylesheet once', () => {
    mount();
    expect(screen.getByText(en('websiteApp.cms.fonts.results', { count: 2 }))).toBeInTheDocument();
    expect(screen.getByText('Lora')).toBeInTheDocument();
    expect(screen.getByText('serif · 400, 500, 700')).toBeInTheDocument();
    const links = [...document.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((link) => link.href);
    expect(links.some((href) => href.includes('family=Lora'))).toBe(true);
    expect(links.filter((href) => href.includes('family=Bebas'))).toHaveLength(1);
  });

  it('searches after a pause and filters by category', async () => {
    mount();
    fireEvent.change(screen.getByLabelText(en('websiteApp.cms.fonts.search')), { target: { value: 'lor' } });
    await waitFor(() => expect(queryOptions.get(CMS_GOOGLE_FONTS)?.variables).toMatchObject({ search: 'lor', category: null }));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByRole('option', { name: 'display' }));
    await waitFor(() => expect(queryOptions.get(CMS_GOOGLE_FONTS)?.variables).toMatchObject({ category: 'display' }));
  });

  it('adds the picked family with its default weights and the fallback for its category', async () => {
    const { onAdd, onClose } = mount();
    fireEvent.click(screen.getByRole('button', { name: `${en('websiteApp.cms.fonts.choose')}: Lora` }));
    const form = await screen.findByTestId('cms-google-font-form');
    // 400 and 700 are pre-checked; 500 is not.
    const boxes = within(form).getAllByRole('checkbox');
    expect(boxes.map((box) => (box as HTMLInputElement).checked)).toEqual([true, false, true]);
    fireEvent.click(boxes[1]);
    fireEvent.click(within(form).getByRole('switch'));
    fireEvent.click(within(form).getByRole('button', { name: en('websiteApp.cms.fonts.add') }));
    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      family: 'Lora',
      source: 'GOOGLE',
      weights: [400, 500, 700],
      italic: true,
      role: 'BODY',
      fallback: 'serif',
      files: [],
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('refuses a family with no weight, and goes back to the catalogue', async () => {
    const { onAdd } = mount();
    fireEvent.click(screen.getByRole('button', { name: `${en('websiteApp.cms.fonts.choose')}: Bebas Neue` }));
    const form = await screen.findByTestId('cms-google-font-form');
    fireEvent.click(within(form).getAllByRole('checkbox')[0]);
    fireEvent.click(within(form).getByRole('button', { name: en('websiteApp.cms.fonts.add') }));
    expect(await within(form).findByText(en('websiteApp.cms.fonts.errWeights'))).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
    fireEvent.click(within(form).getByRole('button', { name: en('websiteApp.cms.fonts.back') }));
    expect(await screen.findByText('Bebas Neue')).toBeInTheDocument();
  });

  it('shows no results and a failed read', () => {
    answerQuery(CMS_GOOGLE_FONTS, { data: { cmsGoogleFonts: { total: 0, categories: [], fonts: [] } } });
    const first = renderWithProviders(<GoogleFontDialog open onClose={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByText(en('websiteApp.cms.fonts.noResults'))).toBeInTheDocument();
    first.unmount();
    answerQuery(CMS_GOOGLE_FONTS, { error: new Error('x') });
    renderWithProviders(<GoogleFontDialog open onClose={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByText(en('websiteApp.cms.fonts.loadFailed'))).toBeInTheDocument();
  });

  it('does not fetch while closed', () => {
    answerQuery(CMS_GOOGLE_FONTS, { data: { cmsGoogleFonts: PAGE } });
    renderWithProviders(<GoogleFontDialog open={false} onClose={vi.fn()} onAdd={vi.fn()} />);
    expect(queryOptions.get(CMS_GOOGLE_FONTS)?.skip).toBe(true);
    expect(screen.queryByText('Lora')).not.toBeInTheDocument();
  });
});

describe('CustomFontDialog', () => {
  const mount = (open = true) => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    const view = render(<CustomFontDialog open={open} onClose={onClose} onAdd={onAdd} />);
    return { onAdd, onClose, view };
  };

  const chooseFile = (dialog: HTMLElement, index = 0) => {
    const input = dialog.querySelectorAll('input[type="file"]')[index] as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'Brand-Bold.woff2', { type: 'font/woff2' })] } });
  };

  it('needs a valid family name and an uploaded file before it adds', async () => {
    const { onAdd } = mount();
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: en('websiteApp.cms.fonts.add') }));
    expect(await within(dialog).findByText(en('websiteApp.cms.fonts.errFamily'))).toBeInTheDocument();
    expect(within(dialog).getByText(en('websiteApp.cms.fonts.errFile'))).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('uploads each file and builds the family from them', async () => {
    upload.mockResolvedValue('https://ik.test/website/fonts/Brand-Bold.woff2');
    const { onAdd, onClose } = mount();
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(label('websiteApp.cms.fonts.family')), { target: { value: 'Brand Sans' } });
    chooseFile(dialog);
    expect(await within(dialog).findByText('Brand-Bold.woff2')).toBeInTheDocument();
    expect(upload).toHaveBeenCalledWith(expect.any(File), '/website/fonts', expect.any(Function));

    // A second file, italic.
    fireEvent.click(within(dialog).getByRole('button', { name: en('websiteApp.cms.fonts.addFile') }));
    await waitFor(() => expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(2));
    chooseFile(dialog, 1);
    await waitFor(() => expect(within(dialog).getAllByText('Brand-Bold.woff2')).toHaveLength(2));
    fireEvent.click(within(dialog).getByRole('button', { name: en('websiteApp.cms.fonts.add') }));
    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      family: 'Brand Sans',
      source: 'CUSTOM',
      weights: [400, 700],
      italic: false,
      role: 'HEADING',
      fallback: 'sans-serif',
    });
    expect(onAdd.mock.calls[0][0].files).toHaveLength(2);
    expect(onClose).toHaveBeenCalled();
  });

  it('tells the editor when an upload failed and lets them remove the row', async () => {
    upload.mockRejectedValue(new Error('ImageKit 500'));
    mount();
    const dialog = await screen.findByRole('dialog');
    chooseFile(dialog);
    expect(await within(dialog).findByText(en('websiteApp.cms.fonts.uploadFailed'))).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: en('websiteApp.cms.fonts.removeFile') }));
    await waitFor(() => expect(dialog.querySelectorAll('input[type="file"]')).toHaveLength(0));
    fireEvent.click(within(dialog).getByRole('button', { name: en('websiteApp.cms.fonts.add') }));
    expect(await within(dialog).findByText(en('websiteApp.cms.fonts.errFiles'))).toBeInTheDocument();
  });

  it('renders nothing of the form while closed', () => {
    mount(false);
    expect(screen.queryByTestId('cms-custom-font-form')).not.toBeInTheDocument();
  });
});
