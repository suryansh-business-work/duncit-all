import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ServiceOfferedModel } from './serviceOffered.model';
import { CategoryModel } from '@modules/pods/category/category.model';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);
const oid = (v?: string | null) => (v ? new Types.ObjectId(v) : null);

/** "Sound & Lighting!" → "sound-lighting" — the key the duplicate check uses. */
export const slugifyTitle = (title: string) =>
  String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const pub = (doc: any, names?: Map<string, string>) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const nameOf = (id: any) => (id && names ? names.get(String(id)) ?? null : null);
  return {
    id: String(o._id),
    title: o.title,
    slug: o.slug ?? slugifyTitle(o.title),
    super_category_id: o.super_category_id ? String(o.super_category_id) : null,
    category_id: o.category_id ? String(o.category_id) : null,
    sub_category_id: o.sub_category_id ? String(o.sub_category_id) : null,
    super_category_name: nameOf(o.super_category_id),
    category_name: nameOf(o.category_id),
    sub_category_name: nameOf(o.sub_category_id),
    applies_to_venue: o.applies_to_venue !== false,
    applies_to_host: o.applies_to_host !== false,
    is_active: o.is_active !== false,
    sort_order: o.sort_order ?? 0,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

/** Batch-resolve category names for the ids referenced across the given docs. */
async function categoryNameMap(docs: any[]): Promise<Map<string, string>> {
  const ids = new Set<string>();
  for (const d of docs) {
    for (const k of ['super_category_id', 'category_id', 'sub_category_id'] as const) {
      if (d[k]) ids.add(String(d[k]));
    }
  }
  if (ids.size === 0) return new Map();
  const cats = await CategoryModel.find({ _id: { $in: [...ids] } }).select('name').lean();
  return new Map(cats.map((c: any) => [String(c._id), c.name as string]));
}

/** Re-title a service doc (in place), enforcing the per-slot unique-slug rule. */
async function applyTitleUpdate(doc: any, rawTitle: string): Promise<void> {
  const title = rawTitle.trim();
  const slug = slugifyTitle(title);
  if (!slug) throw new GraphQLError('Title is required', { extensions: { code: 'BAD_USER_INPUT' } });
  if (slug !== doc.slug) {
    const dupe = await ServiceOfferedModel.findOne({
      super_category_id: doc.super_category_id,
      category_id: doc.category_id ?? null,
      sub_category_id: doc.sub_category_id ?? null,
      slug,
      _id: { $ne: doc._id },
    });
    if (dupe) {
      throw new GraphQLError('A service with that title already exists in this category', {
        extensions: { code: 'CONFLICT' },
      });
    }
  }
  doc.title = title;
  doc.slug = slug;
}

export interface ServiceOfferedFilter {
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  is_active?: boolean | null;
  applies_to_venue?: boolean | null;
  applies_to_host?: boolean | null;
  search?: string | null;
}

export const serviceOfferedService = {
  async list(filter: ServiceOfferedFilter = {}) {
    const q: any = {};
    if (filter.super_category_id) q.super_category_id = oid(filter.super_category_id);
    if (filter.category_id) q.category_id = oid(filter.category_id);
    if (filter.sub_category_id) q.sub_category_id = oid(filter.sub_category_id);
    if (filter.is_active != null) q.is_active = filter.is_active;
    // Treat false here as "must apply to this side" — the lead-form picker only
    // ever requests `true`, so we only constrain when true is asked for.
    if (filter.applies_to_venue) q.applies_to_venue = { $ne: false };
    if (filter.applies_to_host) q.applies_to_host = { $ne: false };
    if (filter.search) {
      q.title = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
    }
    const docs = await ServiceOfferedModel.find(q).sort({ sort_order: 1, title: 1 }).lean();
    const names = await categoryNameMap(docs);
    return docs.map((d) => pub(d, names));
  },

  /** Bulk-create one or many titles under a single hierarchy slot (dedupes). */
  async createMany(
    input: {
      super_category_id: string;
      category_id?: string | null;
      sub_category_id?: string | null;
      applies_to_venue?: boolean | null;
      applies_to_host?: boolean | null;
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
    const appliesToVenue = input.applies_to_venue !== false;
    const appliesToHost = input.applies_to_host !== false;
    if (!appliesToVenue && !appliesToHost) {
      throw new GraphQLError('Pick at least one of Venue or Host', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const base = {
      super_category_id: oid(input.super_category_id),
      category_id: oid(input.category_id ?? null),
      sub_category_id: oid(input.sub_category_id ?? null),
      applies_to_venue: appliesToVenue,
      applies_to_host: appliesToHost,
      created_by: by ?? null,
    };
    // Skip slugs that already exist in this exact hierarchy slot so re-adding is
    // idempotent (the unique index is a backstop for races). De-dupe the incoming
    // batch by slug too, so "Catering" + "catering" can't both slip through.
    const existing = await ServiceOfferedModel.find({
      super_category_id: base.super_category_id,
      category_id: base.category_id,
      sub_category_id: base.sub_category_id,
    })
      .select('slug')
      .lean();
    const have = new Set(existing.map((e: any) => String(e.slug)));
    const created: any[] = [];
    for (const title of titles) {
      const slug = slugifyTitle(title);
      if (!slug || have.has(slug)) continue;
      have.add(slug);
      try {
        created.push(pub(await ServiceOfferedModel.create({ ...base, title, slug })));
      } catch (err: any) {
        if (err?.code !== 11000) throw err;
      }
    }
    return created;
  },

  async update(
    id: string,
    input: {
      title?: string | null;
      is_active?: boolean | null;
      sort_order?: number | null;
      applies_to_venue?: boolean | null;
      applies_to_host?: boolean | null;
    }
  ) {
    const doc = await ServiceOfferedModel.findById(id);
    if (!doc) throw new GraphQLError('Service not found', { extensions: { code: 'NOT_FOUND' } });
    if (input.title != null) await applyTitleUpdate(doc, input.title);
    if (input.is_active != null) doc.is_active = input.is_active;
    if (input.sort_order != null) doc.sort_order = input.sort_order;
    const nextVenue = input.applies_to_venue ?? doc.applies_to_venue !== false;
    const nextHost = input.applies_to_host ?? doc.applies_to_host !== false;
    if (input.applies_to_venue != null || input.applies_to_host != null) {
      if (!nextVenue && !nextHost) {
        throw new GraphQLError('Pick at least one of Venue or Host', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      doc.applies_to_venue = nextVenue;
      doc.applies_to_host = nextHost;
    }
    await doc.save();
    return pub(doc, await categoryNameMap([doc]));
  },

  async remove(id: string) {
    const doc = await ServiceOfferedModel.findByIdAndDelete(id);
    if (!doc) throw new GraphQLError('Service not found', { extensions: { code: 'NOT_FOUND' } });
    return true;
  },

  /**
   * One-time backfill for the `slug` field added alongside slug-based dedup.
   * Populates slugs on legacy docs (dropping any that would now collide within a
   * slot) then syncs indexes so the stale title-based unique index is replaced.
   */
  async backfillSlugs() {
    const legacy = await ServiceOfferedModel.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] });
    const seen = new Set<string>();
    for (const doc of legacy) {
      const slug = slugifyTitle(doc.title);
      const key = [doc.super_category_id, doc.category_id ?? '', doc.sub_category_id ?? '', slug].join('|');
      if (!slug || seen.has(key)) {
        await ServiceOfferedModel.deleteOne({ _id: doc._id });
        continue;
      }
      seen.add(key);
      doc.slug = slug;
      await doc.save();
    }
    // Replace the old `(…, title)` unique index with the new `(…, slug)` one.
    await ServiceOfferedModel.syncIndexes().catch(() => undefined);
  },
};
