import type { CmsEntryRow } from '../../src/pages/cms/queries/entries';

/** One collection entry as the entries table lists it; carries __typename for the mocked cache. */
export const makeCmsEntryRow = (over: Partial<CmsEntryRow> = {}): CmsEntryRow & { __typename: 'CmsEntry' } => ({
  id: 'entry-1',
  site_id: 'site-1',
  collection_type: 'BLOG',
  title: 'Launch week',
  slug: 'launch-week',
  summary: 'Five days of pods.',
  cover_image_url: '',
  category: 'News',
  author_name: 'Duncit team',
  is_published: false,
  published_at: null,
  sort_order: 0,
  updated_at: '2026-10-01T10:00:00.000Z',
  ...over,
  __typename: 'CmsEntry',
});

/** The page wrapper `cmsEntriesTable` answers with. */
export const entriesPage = (rows: CmsEntryRow[]) => ({
  data: { cmsEntriesTable: { __typename: 'CmsEntryTablePage', total: rows.length, rows } },
});
