import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import EntrySeoFields from '../../src/pages/cms/entries/entry-form/EntrySeoFields';
import { entrySchema, toEntryFormValues, type EntryFormOutput, type EntryFormValues } from '../../src/pages/cms/entries/entry-form/entry.types';
import SiteForm from '../../src/pages/cms/sites/site-form/site.form';
import { renderWithProviders } from '../testkit';
import { makeCmsSeo, makeCmsSiteRow } from '../mocks/cms.mock';

vi.mock('@duncit/media-picker', () => ({
  SingleImageUploadField: ({ label, helperText }: { label: string; helperText?: string }) => (
    <label>
      {label}
      <input aria-label={label} readOnly />
      <span>{helperText}</span>
    </label>
  ),
}));

const t = (key: string) => key;

/** The entry's SEO section inside a form validated by the real entry schema. */
function EntrySeoHarness({ onSubmit, image = '' }: Readonly<{ onSubmit: (values: EntryFormOutput) => void; image?: string }>) {
  const { control, handleSubmit } = useForm<EntryFormValues, unknown, EntryFormOutput>({
    defaultValues: { ...toEntryFormValues(null), title: 'Launch week', seo_image: image },
    resolver: zodResolver(entrySchema(t)) as Resolver<EntryFormValues, unknown, EntryFormOutput>,
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <EntrySeoFields control={control} />
      <button type="submit">submit</button>
    </form>
  );
}

describe('EntrySeoFields — sharing', () => {
  it('lets an entry carry its own share card and extra meta tags', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<EntrySeoHarness onSubmit={onSubmit} />);
    expect(screen.getByRole('heading', { name: 'Sharing & meta tags' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Share title'), { target: { value: 'Launch week recap' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add meta tag' }));
    fireEvent.change(screen.getByLabelText('Name or property'), { target: { value: 'article:author' } });
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'Duncit team' } });
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].seo_sharing).toMatchObject({
      og_title: 'Launch week recap',
      meta_tags: [{ name: 'article:author', content: 'Duncit team' }],
    });
  });

  it('shows the meta-name rule under a bad name and does not submit', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<EntrySeoHarness onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add meta tag' }));
    fireEvent.change(screen.getByLabelText('Name or property'), { target: { value: '9 lives' } });
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(await screen.findByText('websiteApp.cms.seo.errMetaName')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('EntrySeoFields — share image', () => {
  it('flags a share image that is not an https link', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<EntrySeoHarness onSubmit={onSubmit} image="http://cdn.example.com/og.png" />);
    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    expect(await screen.findByText('websiteApp.cms.pageForm.errUrl')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('SiteSeoFields — sharing defaults', () => {
  it('offers only header components as the header and footer components as the footer', async () => {
    const fragments = [
      { id: 'h1', name: 'Main header', kind: 'HEADER' as const },
      { id: 'f1', name: 'Main footer', kind: 'FOOTER' as const },
    ];
    renderWithProviders(<SiteForm site={makeCmsSiteRow()} fragments={fragments} submitting={false} errorMessage={null} onSubmit={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Header component' }));
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual(['None', 'Main header']);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Footer component' }));
    await waitFor(() => expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['None', 'Main footer']));
  });

  it("edits the site's default share card inside the site form", async () => {
    const onSubmit = vi.fn();
    const site = makeCmsSiteRow({ seo: makeCmsSeo({ og_title: 'Duncit', keywords: 'pods' }) });
    renderWithProviders(<SiteForm site={site} fragments={[]} submitting={false} errorMessage={null} onSubmit={onSubmit} />);
    expect(screen.getByLabelText('Share title')).toHaveValue('Duncit');
    expect(screen.getByLabelText('Keywords')).toHaveValue('pods');
    fireEvent.change(screen.getByLabelText('Share description'), { target: { value: 'Meet people near you' } });
    fireEvent.click(screen.getByTestId('cms-site-save'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].seo_sharing).toMatchObject({ og_title: 'Duncit', og_description: 'Meet people near you', keywords: 'pods' });
  });
});
