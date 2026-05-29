import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  CommunicationLogModel,
  type CommsLogEntity,
  type CommsLogType,
} from './communicationLog.model';
import { servamService } from '@services/servam/servam.service';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    type: o.type as CommsLogType,
    direction: o.direction ?? 'OUTBOUND',
    entity_type: o.entity_type as CommsLogEntity,
    entity_id: String(o.entity_id),
    provider_id: o.provider_id ? String(o.provider_id) : null,
    provider_name: o.provider_name ?? '',
    contact_name: o.contact_name ?? '',
    contact_value: o.contact_value ?? '',
    subject: o.subject ?? '',
    body: o.body ?? '',
    status: o.status ?? 'QUEUED',
    error_message: o.error_message ?? '',
    duration_seconds: Number(o.duration_seconds ?? 0),
    recording_url: o.recording_url ?? '',
    transcript: o.transcript ?? '',
    transcript_status: o.transcript_status ?? 'NONE',
    external_id: o.external_id ?? '',
    created_by: o.created_by ?? null,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

export interface CreateLogInput {
  type: CommsLogType;
  entity_type: CommsLogEntity;
  entity_id: string;
  provider_id?: string | null;
  provider_name?: string | null;
  contact_name?: string | null;
  contact_value: string;
  subject?: string | null;
  body?: string | null;
  status?: string;
  error_message?: string | null;
  external_id?: string | null;
  duration_seconds?: number | null;
  recording_url?: string | null;
  created_by?: string | null;
  metadata?: Record<string, unknown> | null;
}

export const communicationLogService = {
  async list(
    filter: {
      entity_type?: CommsLogEntity | null;
      entity_id?: string | null;
      type?: CommsLogType | null;
      status?: string | null;
      search?: string | null;
      from_date?: string | null;
      to_date?: string | null;
    },
    page: { limit?: number | null; offset?: number | null }
  ) {
    const query: any = {};
    if (filter.entity_type) query.entity_type = filter.entity_type;
    if (filter.entity_id) query.entity_id = new Types.ObjectId(filter.entity_id);
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      const rx = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { contact_value: rx },
        { contact_name: rx },
        { subject: rx },
        { body: rx },
        { transcript: rx },
      ];
    }
    if (filter.from_date || filter.to_date) {
      query.created_at = {};
      if (filter.from_date) query.created_at.$gte = new Date(filter.from_date);
      if (filter.to_date) query.created_at.$lt = new Date(filter.to_date);
    }
    const limit = Math.min(Math.max(page.limit ?? 50, 1), 200);
    const offset = Math.max(page.offset ?? 0, 0);
    const [items, total] = await Promise.all([
      CommunicationLogModel.find(query).sort({ created_at: -1 }).skip(offset).limit(limit),
      CommunicationLogModel.countDocuments(query),
    ]);
    return { items: items.map(pub), total };
  },

  async get(id: string) {
    const doc = await CommunicationLogModel.findById(id);
    return doc ? pub(doc) : null;
  },

  async create(input: CreateLogInput) {
    const doc = await CommunicationLogModel.create({
      type: input.type,
      direction: 'OUTBOUND',
      entity_type: input.entity_type,
      entity_id: new Types.ObjectId(input.entity_id),
      provider_id: input.provider_id ? new Types.ObjectId(input.provider_id) : null,
      provider_name: input.provider_name ?? '',
      contact_name: input.contact_name ?? '',
      contact_value: input.contact_value,
      subject: input.subject ?? '',
      body: input.body ?? '',
      status: (input.status as any) ?? 'QUEUED',
      error_message: input.error_message ?? '',
      duration_seconds: input.duration_seconds ?? 0,
      recording_url: input.recording_url ?? '',
      external_id: input.external_id ?? '',
      transcript_status: input.type === 'CALL' ? 'PENDING' : 'NONE',
      created_by: input.created_by ?? null,
      metadata: input.metadata ?? {},
    });
    return pub(doc);
  },

  async requestTranscript(id: string) {
    const doc = await CommunicationLogModel.findById(id);
    if (!doc) throw new GraphQLError('Log not found', { extensions: { code: 'NOT_FOUND' } });
    if (doc.type !== 'CALL') {
      throw new GraphQLError('Transcripts are only available for CALL logs', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (!doc.recording_url) {
      doc.transcript_status = 'PENDING';
      await doc.save();
      return pub(doc);
    }
    doc.transcript_status = 'PENDING';
    await doc.save();
    const result = await servamService.fetchTranscript({ recording_url: doc.recording_url });
    if (result.ok && result.transcript) {
      doc.transcript = result.transcript;
      doc.transcript_status = 'READY';
    } else {
      doc.transcript_status = 'FAILED';
      doc.error_message = result.message;
    }
    await doc.save();
    return pub(doc);
  },
};
