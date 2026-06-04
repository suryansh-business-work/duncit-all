import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ServiceOfferedModel } from './serviceOffered.model';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);
const oid = (v?: string | null) => (v ? new Types.ObjectId(v) : null);

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    title: o.title,
    super_category_id: o.super_category_id ? String(o.super_category_id) : null,
    category_id: o.category_id ? String(o.category_id) : null,
    sub_category_id: o.sub_category_id ? String(o.sub_category_id) : null,
    is_active: o.is_active !== false,
    sort_order: o.sort_order ?? 0,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

export interface ServiceOfferedFilter {
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  is_active?: boolean | null;
  search?: string | null;
}

export const serviceOfferedService = {
  async list(filter: ServiceOfferedFilter = {}) {
    const q: any = {};
    if (filter.super_category_id) q.super_category_id = oid(filter.super_category_id);
    if (filter.category_id) q.category_id = oid(filter.category_id);
    if (filter.sub_category_id) q.sub_category_id = oid(filter.sub_category_id);
    if (filter.is_active != null) q.is_active = filter.is_active;
    if (filter.search) {
      q.title = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    const docs = await ServiceOfferedModel.find(q).sort({ sort_order: 1, title: 1 });
    return docs.map(pub);
  },

  /** Bulk-create one or many titles under a single hierarchy slot (dedupes). */
  async createMany(
    input: {
      super_category_id: string;
      category_id?: string | null;
      sub_category_id?: string | null;
      titles: string[];
    },
    by?: string | null
  ) {
    if (!input.super_category_id) {
      throw new GraphQLError('Super category is required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const titles = Array.from(
      new Set((input.titles ?? []).map((t) => String(t || '').trim()).filter(Boolean))
    );
    if (titles.length === 0) {
      throw new GraphQLError('Add at least one service title', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const base = {
      super_category_id: oid(input.super_category_id),
      category_id: oid(input.category_id ?? null),
      sub_category_id: oid(input.sub_category_id ?? null),
      created_by: by ?? null,
    };
    // Skip titles that already exist in this exact hierarchy slot so re-adding
    // is idempotent (the unique index is a backstop for races).
    const existing = await ServiceOfferedModel.find({
      super_category_id: base.super_category_id,
      category_id: base.category_id,
      sub_category_id: base.sub_category_id,
      title: { $in: titles },
    })
      .select('title')
      .lean();
    const have = new Set(existing.map((e: any) => String(e.title)));
    const created: any[] = [];
    for (const title of titles.filter((t) => !have.has(t))) {
      try {
        created.push(pub(await ServiceOfferedModel.create({ ...base, title })));
      } catch (err: any) {
        if (err?.code !== 11000) throw err;
      }
    }
    return created;
  },

  async update(id: string, input: { title?: string | null; is_active?: boolean | null; sort_order?: number | null }) {
    const doc = await ServiceOfferedModel.findById(id);
    if (!doc) throw new GraphQLError('Service not found', { extensions: { code: 'NOT_FOUND' } });
    if (input.title != null) doc.title = input.title.trim();
    if (input.is_active != null) doc.is_active = input.is_active;
    if (input.sort_order != null) doc.sort_order = input.sort_order;
    await doc.save();
    return pub(doc);
  },

  async remove(id: string) {
    const doc = await ServiceOfferedModel.findByIdAndDelete(id);
    if (!doc) throw new GraphQLError('Service not found', { extensions: { code: 'NOT_FOUND' } });
    return true;
  },
};
