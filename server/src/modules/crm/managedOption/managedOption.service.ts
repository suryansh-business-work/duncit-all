import { GraphQLError } from 'graphql';
import { ManagedOptionModel, type ManagedOptionGroup } from './managedOption.model';
import * as C from '@modules/crm/crm/crm.constants';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    name: o.name,
    group: o.group,
    sort_order: o.sort_order ?? 0,
    is_active: o.is_active !== false,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

const conflict = () =>
  new GraphQLError('An option with that name already exists in this list', {
    extensions: { code: 'CONFLICT' },
  });

const notFound = () =>
  new GraphQLError('Option not found', { extensions: { code: 'NOT_FOUND' } });

export const managedOptionService = {
  async list(group: ManagedOptionGroup, includeInactive = false) {
    const q: Record<string, any> = { group };
    if (!includeInactive) q.is_active = { $ne: false };
    const docs = await ManagedOptionModel.find(q).sort({ sort_order: 1, name: 1 });
    return docs.map(pub);
  },

  /** Active option names for a group — consumed by `crmLeadConfig`. */
  async activeNames(group: ManagedOptionGroup): Promise<string[]> {
    const docs = await ManagedOptionModel.find({ group, is_active: { $ne: false } })
      .sort({ sort_order: 1, name: 1 })
      .select('name')
      .lean();
    const names = docs.map((d: any) => d.name as string);
    return names.includes('Other') ? names : [...names, 'Other'];
  },

  async create(input: { name: string; group: ManagedOptionGroup; sort_order?: number | null; is_active?: boolean | null }) {
    const name = (input.name ?? '').trim();
    if (!name) throw new GraphQLError('Name is required', { extensions: { code: 'BAD_USER_INPUT' } });
    const existing = await ManagedOptionModel.findOne({ group: input.group, name });
    if (existing) throw conflict();
    const doc = await ManagedOptionModel.create({
      name,
      group: input.group,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active !== false,
    });
    return pub(doc);
  },

  async update(id: string, input: { name?: string | null; sort_order?: number | null; is_active?: boolean | null }) {
    const doc = await ManagedOptionModel.findById(id);
    if (!doc) throw notFound();
    if (input.name != null) {
      const name = input.name.trim();
      if (!name) throw new GraphQLError('Name is required', { extensions: { code: 'BAD_USER_INPUT' } });
      if (name !== doc.name) {
        const dupe = await ManagedOptionModel.findOne({ group: doc.group, name, _id: { $ne: doc._id } });
        if (dupe) throw conflict();
      }
      doc.name = name;
    }
    if (input.sort_order != null) doc.sort_order = input.sort_order;
    if (input.is_active != null) doc.is_active = input.is_active;
    await doc.save();
    return pub(doc);
  },

  async remove(id: string) {
    const doc = await ManagedOptionModel.findByIdAndDelete(id);
    if (!doc) throw notFound();
    return true;
  },

  /** Seed each group from the legacy constants only when its bucket is empty. */
  async seedDefaults() {
    const seeds: Array<{ group: ManagedOptionGroup; names: string[] }> = [
      { group: 'AMENITY', names: C.AMENITIES },
      { group: 'EVENT_SUITABILITY', names: C.VENUE_EVENT_SUITABILITY.filter((n) => n !== 'Other') },
    ];
    for (const { group, names } of seeds) {
      const count = await ManagedOptionModel.countDocuments({ group });
      if (count > 0) continue;
      await ManagedOptionModel.insertMany(
        names.map((name, idx) => ({ name, group, sort_order: idx, is_active: true })),
        { ordered: false }
      ).catch(() => undefined);
    }
  },
};
