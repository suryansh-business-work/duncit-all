import { GraphQLError } from 'graphql';
import { CategoryModel, type CategoryLevel } from './category.model';

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
    if (doc!.is_system) {
      throw new GraphQLError('System category cannot be deleted', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    const childCount = await CategoryModel.countDocuments({ parent_id: doc!._id });
    if (childCount > 0) {
      throw new GraphQLError('Delete or reassign child categories first', {
        extensions: { code: 'CONFLICT' },
      });
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
