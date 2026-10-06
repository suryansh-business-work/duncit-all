import type { CmsSiteInput } from '@duncit/gql-types';
import { cmsSiteService } from '../../cmsSite.service';
import { CmsSiteModel } from '../../cmsSite.model';

const input = (seo: CmsSiteInput['seo']): CmsSiteInput => ({
  key: 'seo-site',
  name: 'SEO site',
  domains: ['seo.duncit.test'],
  is_active: true,
  favicon_url: '',
  seo,
  collections: [],
  collection_paths: [],
});

describe('cmsSiteService: the SEO every page inherits', () => {
  it('keeps the share card, keywords, structured data and meta tags, and nothing per-page', async () => {
    const created = await cmsSiteService.create(
      input({
        title: 'Duncit',
        description: 'Meet people',
        og_image_url: 'https://cdn.test/og.png',
        canonical_url: 'https://duncit.com/',
        noindex: true,
        og_title: 'Share title',
        og_description: 'Share text',
        twitter_card: 'summary',
        keywords: 'pods',
        json_ld: '{"@type":"Organization"}',
        meta_tags: [{ name: 'theme-color', content: '#000' }],
      })
    );
    expect(created?.seo).toEqual({
      title: 'Duncit',
      description: 'Meet people',
      og_image_url: 'https://cdn.test/og.png',
      canonical_url: '',
      noindex: false,
      og_title: 'Share title',
      og_description: 'Share text',
      twitter_card: 'summary',
      keywords: 'pods',
      json_ld: '{"@type":"Organization"}',
      meta_tags: [{ name: 'theme-color', content: '#000' }],
    });
    const stored = await CmsSiteModel.findById(created?.id).lean();
    expect(stored?.seo).not.toHaveProperty('canonical_url');
    expect(stored?.seo).not.toHaveProperty('noindex');
  });

  it('clears what an update leaves out, and saves blanks when there is no SEO at all', async () => {
    const created = await cmsSiteService.create(input({ og_title: 'Old', meta_tags: [{ name: 'a', content: 'b' }] }));
    const updated = await cmsSiteService.update(String(created?.id), input({ title: 'New' }));
    expect(updated?.seo).toMatchObject({ title: 'New', og_title: '', meta_tags: [] });
    const blank = await cmsSiteService.update(String(created?.id), input(null));
    expect(blank?.seo).toMatchObject({ title: '', description: '', twitter_card: '', json_ld: '', meta_tags: [] });
  });
});
