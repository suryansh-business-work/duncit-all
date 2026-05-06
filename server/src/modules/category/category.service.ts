import { GraphQLError } from 'graphql';
import { CategoryModel, type CategoryLevel } from './category.model';
import { ClubModel } from '../club/club.model';
import { PodModel } from '../pod/pod.model';
import { FaqModel } from '../faq/faq.model';
import { FaqSubmissionModel } from '../faq/faqSubmission.model';
import { SliderModel } from '../slider/slider.model';
import { ActiveUserPingModel } from '../analytics/activeUser.model';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toPub = (d: any) => {
  if (!d) return null;
  return {
    id: String(d._id),
    name: d.name,
    slug: d.slug,
    icon: d.icon ?? '',
    description: d.description ?? '',
    media: (d.media ?? []).map((m: any) => ({ url: m.url, type: m.type ?? 'IMAGE' })),
    level: d.level,
    parent_id: d.parent_id ? String(d.parent_id) : null,
    is_active: !!d.is_active,
    is_system: !!d.is_system,
    sort_order: d.sort_order ?? 0,
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
};

function notFound(): never {
  throw new GraphQLError('Category not found', { extensions: { code: 'NOT_FOUND' } });
}

function validateParent(level: CategoryLevel, parent: any) {
  if (level === 'SUPER') {
    if (parent) {
      throw new GraphQLError('Super category must not have a parent', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    return;
  }
  if (!parent) {
    throw new GraphQLError(`${level} requires a parent_id`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (level === 'CATEGORY' && parent.level !== 'SUPER') {
    throw new GraphQLError('Category parent must be a SUPER category', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (level === 'SUB' && parent.level !== 'CATEGORY') {
    throw new GraphQLError('Sub-category parent must be a CATEGORY', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

export const categoryService = {
  async list(filter?: { level?: CategoryLevel; parent_id?: string | null; search?: string }) {
    const q: any = {};
    if (filter?.level) q.level = filter.level;
    if (filter?.parent_id !== undefined) q.parent_id = filter.parent_id || null;
    if (filter?.search) q.name = new RegExp(filter.search, 'i');
    const docs = await CategoryModel.find(q).sort({ sort_order: 1, name: 1 });
    return docs.map(toPub);
  },

  async tree() {
    const all = await CategoryModel.find().sort({ sort_order: 1, name: 1 });
    return all.map(toPub);
  },

  async getById(id: string) {
    const d = await CategoryModel.findById(id);
    return toPub(d);
  },

  async create(input: {
    name: string;
    level: CategoryLevel;
    parent_id?: string | null;
    icon?: string;
    description?: string;
    media?: { url: string; type?: 'IMAGE' | 'VIDEO' }[];
    sort_order?: number;
  }) {
    const parent = input.parent_id ? await CategoryModel.findById(input.parent_id) : null;
    if (input.parent_id && !parent) notFound();
    validateParent(input.level, parent);

    const slug = slugify(input.name);
    const dupe = await CategoryModel.findOne({ parent_id: input.parent_id ?? null, slug });
    if (dupe) {
      throw new GraphQLError('A sibling with that name already exists', {
        extensions: { code: 'CONFLICT' },
      });
    }

    const doc = await CategoryModel.create({
      name: input.name.trim(),
      slug,
      level: input.level,
      parent_id: input.parent_id ?? null,
      icon: input.icon ?? '',
      description: input.description ?? '',
      media: input.media ?? [],
      sort_order: input.sort_order ?? 0,
    });
    return toPub(doc);
  },

  async update(
    id: string,
    input: {
      name?: string;
      icon?: string;
      description?: string;
      media?: { url: string; type?: 'IMAGE' | 'VIDEO' }[];
      sort_order?: number;
      is_active?: boolean;
    }
  ) {
    const doc = await CategoryModel.findById(id);
    if (!doc) notFound();
    if (input.name !== undefined) {
      doc.name = input.name.trim();
      doc.slug = slugify(input.name);
    }
    if (input.icon !== undefined) doc.icon = input.icon;
    if (input.description !== undefined) doc.description = input.description;
    if (input.media !== undefined) doc.media = input.media as any;
    if (input.sort_order !== undefined) doc.sort_order = input.sort_order;
    if (input.is_active !== undefined) doc.is_active = input.is_active;
    await doc.save();
    return toPub(doc);
  },

  async remove(id: string) {
    const doc = await CategoryModel.findById(id);
    if (!doc) notFound();

    // Cascade-delete is fully dynamic — no system/seed protection. Deleting a
    // SUPER category removes all of its descendant CATEGORY/SUB rows along
    // with the related business data (clubs, pods, sliders, FAQs, FAQ
    // submissions, and analytics pings) so the admin doesn't get blocked by
    // legacy references.
    const rootId = doc!._id;
    const isSuper = doc!.level === 'SUPER';

    // Collect every descendant category id (CATEGORY children of a SUPER, plus
    // SUB children of those CATEGORYs). For non-SUPER deletes we still cascade
    // through any direct children to keep the tree consistent.
    const childCats = await CategoryModel.find({ parent_id: rootId });
    const childCatIds = childCats.map((c) => c._id);
    const grandChildCats = childCatIds.length
      ? await CategoryModel.find({ parent_id: { $in: childCatIds } })
      : [];
    const grandChildCatIds = grandChildCats.map((c) => c._id);
    const allCategoryIds = [rootId, ...childCatIds, ...grandChildCatIds];

    // 1. Find clubs that belong to this branch (by super_category_id when
    //    deleting a SUPER, otherwise by category_id match) so we can also
    //    remove their pods.
    const clubMatch: any = isSuper
      ? { $or: [{ super_category_id: rootId }, { category_id: { $in: allCategoryIds } }] }
      : { category_id: { $in: allCategoryIds } };
    const clubs = await ClubModel.find(clubMatch).select('_id');
    const clubIds = clubs.map((c) => c._id);

    // 2. Delete pods first (depend on clubs).
    if (clubIds.length) {
      await PodModel.deleteMany({ club_id: { $in: clubIds } });
      await ClubModel.deleteMany({ _id: { $in: clubIds } });
    }

    // 3. FAQs reference super_category_id directly.
    if (isSuper) {
      await FaqModel.deleteMany({ super_category_id: rootId });
    }

    // 4. Slug-based references (sliders, FAQ submissions, active-user pings).
    const slug = doc!.slug;
    if (slug) {
      await SliderModel.deleteMany({ super_category_slug: slug });
      await FaqSubmissionModel.deleteMany({ super_category_slug: slug });
      await ActiveUserPingModel.deleteMany({ super_category_slug: slug });
    }

    // 5. Finally remove descendant categories then the row itself.
    if (grandChildCatIds.length) {
      await CategoryModel.deleteMany({ _id: { $in: grandChildCatIds } });
    }
    if (childCatIds.length) {
      await CategoryModel.deleteMany({ _id: { $in: childCatIds } });
    }
    await doc!.deleteOne();
    return true;
  },

  async seedDefaults() {
    const supers = [
      { name: 'Human', icon: '🧑', description: 'Categories for human-focused experiences.' },
      { name: 'Pet', icon: '🐾', description: 'Categories for pet-focused experiences.' },
    ];
    for (const s of supers) {
      const slug = slugify(s.name);
      await CategoryModel.updateOne(
        { parent_id: null, slug },
        {
          $setOnInsert: {
            name: s.name,
            slug,
            icon: s.icon,
            description: s.description,
            media: [],
            level: 'SUPER',
            parent_id: null,
            is_active: true,
            is_system: true,
            sort_order: 0,
          },
        },
        { upsert: true }
      );
    }
  },
};
