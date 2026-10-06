import { CmsEntryModel, type ICmsEntry } from './cmsEntry.model';
import { cmsSiteService } from './cmsSite.service';
import { assertId, badInput, notFound, rethrowDuplicate, seoOf, toEntry } from './cms.mappers';
import type { CmsCollection } from './cms.constants';
import type { CmsSeo } from './cmsContent.schema-parts';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { slugify } from '@utils/slug';

export interface CmsEntryInput {
  collection_type: CmsCollection;
  title: string;
  slug?: string;
  summary: string;
  body_html: string;
  cover_image_url: string;
  category: string;
  tags: string[];
  author_name: string;
  fields: { key: string; value: string }[];
  seo?: Partial<CmsSeo>;
  is_published: boolean;
  published_at: string | null;
  sort_order: number;
}

const ENTRY_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'slug', 'summary', 'category', 'author_name'],
  sortFields: {
    title: 'title',
    slug: 'slug',
    category: 'category',
    is_published: 'is_published',
    published_at: 'published_at',
    sort_order: 'sort_order',
    updated_at: 'updated_at',
  },
  filterFields: {
    title: { type: 'string' },
    slug: { type: 'string' },
    category: { type: 'string' },
    is_published: { type: 'boolean' },
    published_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
  defaultSort: { published_at: -1, created_at: -1 },
};

/** The date a published entry shows. Set the first time it goes live (or to
 * the date the editor picked), and kept on later edits so fixing a typo does
 * not move a post to the top of the blog. */
function publishedAt(input: CmsEntryInput, previous: Date | null): Date | null {
  if (input.published_at) {
    const picked = new Date(input.published_at);
    if (Number.isNaN(picked.getTime())) throw badInput('Pick a valid publish date');
    return picked;
  }
  if (!input.is_published) return previous;
  return previous ?? new Date();
}

function fields(input: CmsEntryInput, previous: Date | null) {
  const slug = slugify(input.slug || input.title);
  if (!slug) throw badInput('Give it a title or a slug with letters or digits');
  return {
    collection_type: input.collection_type,
    title: input.title,
    slug,
    summary: input.summary,
    body_html: input.body_html,
    cover_image_url: input.cover_image_url,
    category: input.category,
    tags: [...new Set(input.tags.filter(Boolean))],
    author_name: input.author_name,
    fields: input.fields,
    seo: seoOf(input.seo),
    is_published: input.is_published,
    published_at: publishedAt(input, previous),
    sort_order: input.sort_order,
  };
}

const DUPLICATE = 'Another entry in this collection already uses that slug';

export const cmsEntryService = {
  async table(siteId: string, collection: CmsCollection, input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<ICmsEntry>(
      CmsEntryModel,
      { site_id: assertId(siteId, 'site'), collection_type: collection },
      input,
      ENTRY_TABLE_CONFIG,
      { projection: { body_html: 0 } }
    );
    return { rows: docs.map(toEntry), total, page, page_size };
  },

  async get(id: string) {
    const entry = await CmsEntryModel.findById(assertId(id, 'entry')).exec();
    return entry ? toEntry(entry) : null;
  },

  async create(siteId: string, input: CmsEntryInput, userId: string) {
    const site = await cmsSiteService.requireDoc(siteId);
    try {
      const entry = await CmsEntryModel.create({ ...fields(input, null), site_id: site._id, updated_by: userId });
      return toEntry(entry);
    } catch (error) {
      rethrowDuplicate(error, DUPLICATE);
    }
  },

  async update(id: string, input: CmsEntryInput, userId: string) {
    const current = await CmsEntryModel.findById(assertId(id, 'entry')).select('published_at collection_type').lean();
    if (!current) throw notFound('Entry');
    if (current.collection_type !== input.collection_type) throw badInput('An entry cannot move to another collection');
    try {
      const entry = await CmsEntryModel.findByIdAndUpdate(
        id,
        { $set: { ...fields(input, current.published_at ?? null), updated_by: userId } },
        { new: true, runValidators: true }
      );
      if (!entry) throw notFound('Entry');
      return toEntry(entry);
    } catch (error) {
      rethrowDuplicate(error, DUPLICATE);
    }
  },

  async remove(id: string) {
    const result = await CmsEntryModel.deleteOne({ _id: assertId(id, 'entry') });
    return result.deletedCount > 0;
  },
};
