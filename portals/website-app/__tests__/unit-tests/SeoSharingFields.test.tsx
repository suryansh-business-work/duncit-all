import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import SeoSharingFields from '../../src/pages/cms/components/SeoSharingFields';
import { MAX_SEO_META_TAGS, toSeoSharingValues, type SeoSharingValues } from '../../src/pages/cms/lib/seoSharing';
import { renderWithProviders } from '../testkit';

function Harness({ initial, onValues }: Readonly<{ initial: SeoSharingValues; onValues: (values: SeoSharingValues) => void }>) {
  const { control, watch } = useForm<{ seo_sharing: SeoSharingValues }>({ defaultValues: { seo_sharing: initial } });
  onValues(watch('seo_sharing'));
  return <SeoSharingFields control={control} />;
}

const renderFields = (initial: SeoSharingValues = toSeoSharingValues()) => {
  const onValues = vi.fn<(values: SeoSharingValues) => void>();
  renderWithProviders(<Harness initial={initial} onValues={onValues} />);
  const latest = () => onValues.mock.calls.at(-1)?.[0];
  return { latest };
};

const tagsOf = (count: number) => Array.from({ length: count }, (_, index) => ({ name: `tag${index}`, content: `v${index}` }));

describe('SeoSharingFields', () => {
  it('writes the share title, description, keywords and structured data into seo_sharing', () => {
    const { latest } = renderFields();
    expect(screen.getByRole('heading', { name: 'Sharing & meta tags' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Share title'), { target: { value: 'Meet people' } });
    fireEvent.change(screen.getByLabelText('Share description'), { target: { value: 'Pods near you' } });
    fireEvent.change(screen.getByLabelText('Keywords'), { target: { value: 'pods, events' } });
    fireEvent.change(screen.getByLabelText('Structured data (JSON-LD)'), { target: { value: '{"@type":"Event"}' } });
    expect(latest()).toMatchObject({ og_title: 'Meet people', og_description: 'Pods near you', keywords: 'pods, events', json_ld: '{"@type":"Event"}' });
  });

  it('caps the share title and description at the API lengths', () => {
    renderFields();
    expect(screen.getByLabelText('Share title')).toHaveAttribute('maxLength', '160');
    expect(screen.getByLabelText('Share description')).toHaveAttribute('maxLength', '320');
  });

  it('offers the X card types by name and stores the chosen one', async () => {
    const { latest } = renderFields();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'X (Twitter) card' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Automatic', 'Summary', 'Large image']);
    fireEvent.click(screen.getByRole('option', { name: 'Large image' }));
    expect(latest()?.twitter_card).toBe('summary_large_image');
  });

  it('adds empty meta tag rows and removes the chosen one', () => {
    const { latest } = renderFields({ ...toSeoSharingValues(), meta_tags: [{ name: 'author', content: 'Duncit' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Add meta tag' }));
    const names = screen.getAllByLabelText('Name or property');
    expect(names).toHaveLength(2);
    fireEvent.change(names[1], { target: { value: 'robots' } });
    fireEvent.change(screen.getAllByLabelText('Content')[1], { target: { value: 'noarchive' } });
    expect(latest()?.meta_tags).toEqual([
      { name: 'author', content: 'Duncit' },
      { name: 'robots', content: 'noarchive' },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove meta tag 1' }));
    expect(latest()?.meta_tags).toEqual([{ name: 'robots', content: 'noarchive' }]);
    const remaining = screen.getAllByLabelText('Name or property');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveValue('robots');
  });

  it(`stops adding at ${MAX_SEO_META_TAGS} tags and allows it again after one is removed`, () => {
    renderFields({ ...toSeoSharingValues(), meta_tags: tagsOf(MAX_SEO_META_TAGS) });
    const add = screen.getByRole('button', { name: 'Add meta tag' });
    expect(add).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: `Remove meta tag ${MAX_SEO_META_TAGS}` }));
    expect(add).toBeEnabled();
  });

  it('allows adding the last tag up to the limit', () => {
    renderFields({ ...toSeoSharingValues(), meta_tags: tagsOf(MAX_SEO_META_TAGS - 1) });
    const add = screen.getByRole('button', { name: 'Add meta tag' });
    fireEvent.click(add);
    expect(screen.getAllByLabelText('Name or property')).toHaveLength(MAX_SEO_META_TAGS);
    expect(add).toBeDisabled();
  });
});
