import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ReminderModel, type ReminderEntity, type ReminderStatus } from './reminder.model';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);
const oid = (v?: string | null) => (v ? new Types.ObjectId(v) : null);

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    entity_type: o.entity_type ?? 'GENERAL',
    lead_id: o.lead_id ? String(o.lead_id) : null,
    title: o.title,
    due_at: iso(o.due_at),
    notes: o.notes ?? null,
    status: o.status ?? 'PENDING',
    assigned_to: o.assigned_to ?? null,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

export interface ReminderFilter {
  from?: string | null;
  to?: string | null;
  status?: ReminderStatus | null;
  entity_type?: ReminderEntity | null;
  lead_id?: string | null;
}

const notFound = () => new GraphQLError('Reminder not found', { extensions: { code: 'NOT_FOUND' } });

export const reminderService = {
  async list(filter: ReminderFilter = {}) {
    const q: any = {};
    if (filter.status) q.status = filter.status;
    if (filter.entity_type) q.entity_type = filter.entity_type;
    if (filter.lead_id) q.lead_id = oid(filter.lead_id);
    if (filter.from || filter.to) {
      q.due_at = {};
      if (filter.from) q.due_at.$gte = new Date(filter.from);
      if (filter.to) q.due_at.$lte = new Date(filter.to);
    }
    const docs = await ReminderModel.find(q).sort({ due_at: 1 });
    return docs.map(pub);
  },

  async create(
    input: { entity_type?: ReminderEntity | null; lead_id?: string | null; title: string; due_at: string; notes?: string | null; assigned_to?: string | null },
    by?: string | null
  ) {
    const title = (input.title ?? '').trim();
    if (!title) throw new GraphQLError('Title is required', { extensions: { code: 'BAD_USER_INPUT' } });
    if (!input.due_at) throw new GraphQLError('Due date is required', { extensions: { code: 'BAD_USER_INPUT' } });
    const doc = await ReminderModel.create({
      entity_type: input.entity_type ?? 'GENERAL',
      lead_id: oid(input.lead_id ?? null),
      title,
      due_at: new Date(input.due_at),
      notes: input.notes ?? null,
      assigned_to: input.assigned_to ?? null,
      created_by: by ?? null,
    });
    return pub(doc);
  },

  async update(id: string, input: { title?: string | null; due_at?: string | null; notes?: string | null; status?: ReminderStatus | null; assigned_to?: string | null }) {
    const doc = await ReminderModel.findById(id);
    if (!doc) throw notFound();
    if (input.title != null) doc.title = input.title.trim();
    if (input.due_at != null) doc.due_at = new Date(input.due_at);
    if (input.notes !== undefined) doc.notes = input.notes;
    if (input.status != null) doc.status = input.status;
    if (input.assigned_to !== undefined) doc.assigned_to = input.assigned_to;
    await doc.save();
    return pub(doc);
  },

  async toggleDone(id: string) {
    const doc = await ReminderModel.findById(id);
    if (!doc) throw notFound();
    doc.status = doc.status === 'DONE' ? 'PENDING' : 'DONE';
    await doc.save();
    return pub(doc);
  },

  async remove(id: string) {
    const doc = await ReminderModel.findByIdAndDelete(id);
    if (!doc) throw notFound();
    return true;
  },
};
