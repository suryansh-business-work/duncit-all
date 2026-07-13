import { GraphQLError } from 'graphql';
import { ChallengeModel } from './challenge.model';
import { CategoryModel } from '@modules/pods/category/category.model';

export interface ChallengeInput {
  name?: string;
  description?: string;
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
  is_active?: boolean;
}

const idStr = (v: unknown): string | null => (v ? String(v) : null);

/** One Category-id → name lookup for a batch of challenges (avoids N+1). */
async function nameMap(ids: unknown[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return new Map();
  const cats = await CategoryModel.find({ _id: { $in: unique } }).select('name').lean();
  return new Map(cats.map((c: { _id: unknown; name: string }) => [String(c._id), c.name]));
}

function toPub(d: Record<string, any> | null, names: Map<string, string>) {
  if (!d) return null;
  const nameOf = (v: unknown) => (v ? (names.get(String(v)) ?? null) : null);
  return {
    id: String(d._id),
    name: d.name,
    description: d.description ?? '',
    super_category_id: idStr(d.super_category_id),
    category_id: idStr(d.category_id),
    sub_category_id: idStr(d.sub_category_id),
    super_category_name: nameOf(d.super_category_id),
    category_name: nameOf(d.category_id),
    sub_category_name: nameOf(d.sub_category_id),
    is_active: !!d.is_active,
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
}

function notFound(): never {
  throw new GraphQLError('Challenge not found', { extensions: { code: 'NOT_FOUND' } });
}

const allCategoryIds = (docs: Record<string, any>[]) =>
  docs.flatMap((d) => [d.super_category_id, d.category_id, d.sub_category_id]);

export const challengeService = {
  async list(search?: string | null) {
    const q: Record<string, unknown> = {};
    if (search) {
      q.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
    }
    const docs = await ChallengeModel.find(q).sort({ created_at: -1 }).lean();
    const names = await nameMap(allCategoryIds(docs));
    return docs.map((d) => toPub(d, names));
  },

  async stats() {
    const [total, active] = await Promise.all([
      ChallengeModel.countDocuments({}),
      ChallengeModel.countDocuments({ is_active: true }),
    ]);
    return { total, active };
  },

  async getById(id: string) {
    const d = await ChallengeModel.findById(id).lean();
    if (!d) return null;
    const names = await nameMap(allCategoryIds([d]));
    return toPub(d, names);
  },

  async create(input: ChallengeInput) {
    if (!input.name?.trim()) {
      throw new GraphQLError('A challenge name is required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await ChallengeModel.create({
      name: input.name.trim(),
      description: input.description ?? '',
      super_category_id: input.super_category_id ?? null,
      category_id: input.category_id ?? null,
      sub_category_id: input.sub_category_id ?? null,
    });
    return challengeService.getById(String(doc._id));
  },

  async update(id: string, input: ChallengeInput) {
    const doc = await ChallengeModel.findById(id);
    if (!doc) notFound();
    if (input.name !== undefined) doc.name = input.name.trim();
    if (input.description !== undefined) doc.description = input.description;
    if (input.super_category_id !== undefined) doc.super_category_id = (input.super_category_id ?? null) as never;
    if (input.category_id !== undefined) doc.category_id = (input.category_id ?? null) as never;
    if (input.sub_category_id !== undefined) doc.sub_category_id = (input.sub_category_id ?? null) as never;
    if (input.is_active !== undefined) doc.is_active = input.is_active;
    await doc.save();
    return challengeService.getById(id);
  },

  async remove(id: string) {
    const doc = await ChallengeModel.findById(id);
    if (!doc) notFound();
    await doc.deleteOne();
    return true;
  },
};
