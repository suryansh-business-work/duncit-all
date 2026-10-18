import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { validate } from '@utils/validate';
import { GigCategoryModel, GigJobModel, FreelancerProfileModel, type IGigCategory } from './gigJob.model';
import { DEFAULT_GIG_CATEGORIES } from './gigJob.seed';
import { gigCategoryInputSchema } from './gigJob.validator';

const fail = (code: string, message: string) => new GraphQLError(message, { extensions: { code } });

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export const toGigCategory = (doc: IGigCategory) => ({
  id: String(doc._id),
  slug_id: doc.slug_id,
  title: doc.title,
  description: doc.description ?? '',
  examples: doc.examples ?? [],
  sort_order: doc.sort_order ?? 0,
  is_active: !!doc.is_active,
  created_at: doc.created_at?.toISOString?.() ?? '',
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

const TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'slug_id', 'examples'],
  sortFields: { title: 'title', sort_order: 'sort_order', is_active: 'is_active', created_at: 'created_at' },
  filterFields: { title: { type: 'string' }, is_active: { type: 'boolean' }, created_at: { type: 'date' } },
  defaultSort: { sort_order: 1 },
};

/** Category titles by id, in ONE read — what a page of gigs needs to label its rows. */
export async function categoryTitles(ids: readonly Types.ObjectId[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await GigCategoryModel.find({ _id: { $in: ids } }).select('title').lean();
  return new Map(rows.map((row) => [String(row._id), row.title]));
}

export const gigCategoryService = {
  /** Create-only: an admin's edits survive every boot (see gigJob.seed.ts). */
  async seedDefaults() {
    for (const seed of DEFAULT_GIG_CATEGORIES) {
      await GigCategoryModel.updateOne(
        { slug_id: seed.slug_id },
        { $setOnInsert: { ...seed, description: '', is_active: true } },
        { upsert: true }
      );
    }
  },

  /** What a member picks from: the switched-on categories, in admin order. */
  async listActive() {
    const docs = await GigCategoryModel.find({ is_active: true }).sort({ sort_order: 1, title: 1 });
    return docs.map(toGigCategory);
  },

  async table(input?: TableQueryInput) {
    const { docs, total, page, page_size } = await runTableQuery<IGigCategory>(GigCategoryModel, {}, input, TABLE_CONFIG);
    return { rows: docs.map(toGigCategory), total, page, page_size };
  },

  /** A category a new post or profile may use — refuses a switched-off one. */
  async requireActive(id: string) {
    if (!Types.ObjectId.isValid(id)) throw fail('BAD_USER_INPUT', 'Choose a category');
    const doc = await GigCategoryModel.findOne({ _id: id, is_active: true });
    if (!doc) throw fail('BAD_USER_INPUT', 'That category is no longer available');
    return doc;
  },

  async create(raw: unknown) {
    const input = await validate(gigCategoryInputSchema, raw);
    const base = slugify(input.title) || 'category';
    const taken = await GigCategoryModel.exists({ slug_id: base });
    const slug_id = taken ? `${base}-${Date.now().toString(36)}` : base;
    const doc = await GigCategoryModel.create({ ...input, slug_id });
    return toGigCategory(doc);
  },

  async update(id: string, raw: unknown) {
    const input = await validate(gigCategoryInputSchema, raw);
    const doc = await GigCategoryModel.findByIdAndUpdate(id, { $set: input }, { new: true });
    if (!doc) throw fail('NOT_FOUND', 'Category not found');
    return toGigCategory(doc);
  },

  /** A category a gig or a freelancer still points at is switched off, never deleted. */
  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) throw fail('NOT_FOUND', 'Category not found');
    const oid = new Types.ObjectId(id);
    const [jobs, freelancers] = await Promise.all([
      GigJobModel.exists({ category_id: oid }),
      FreelancerProfileModel.exists({ category_ids: oid }),
    ]);
    if (jobs || freelancers) {
      throw fail('CONFLICT', 'This category is in use. Switch it off instead of deleting it.');
    }
    const res = await GigCategoryModel.deleteOne({ _id: oid });
    return res.deletedCount === 1;
  },
};
