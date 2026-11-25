import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  CommunicationLogModel,
  type CallSentiment,
  type CallSpeaker,
  type CommsLogEntity,
  type CommsLogType,
  type CommunicationLogDoc,
  type SummaryStatus,
} from './communicationLog.model';
import { servamService } from '@services/servam/servam.service';

const iso = (v: unknown): string | null => {
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'string' ? v : null;
};

type Meta = Record<string, unknown>;
const metaText = (meta: Meta, key: string) => (typeof meta[key] === 'string' ? meta[key] : null);

interface StoredSegment {
  seq: number;
  track?: string | null;
  speaker: CallSpeaker;
  text?: string | null;
  confidence?: number | null;
  at?: Date | null;
}

const pubSegment = (s: StoredSegment) => ({
  seq: s.seq,
  speaker: s.speaker,
  text: s.text ?? '',
  confidence: s.confidence ?? null,
  at: iso(s.at),
});

interface StoredSummary {
  status?: SummaryStatus | null;
  text?: string | null;
  key_points?: string[] | null;
  sentiment?: CallSentiment | null;
  outcome?: string | null;
  follow_ups?: string[] | null;
  reminder_id?: string | null;
  error?: string | null;
  generated_at?: Date | null;
}

const pubSummary = (s: StoredSummary | null | undefined) => ({
  status: s?.status ?? 'NONE',
  text: s?.text ?? '',
  key_points: s?.key_points ?? [],
  sentiment: s?.sentiment ?? null,
  outcome: s?.outcome ?? '',
  follow_ups: s?.follow_ups ?? [],
  reminder_id: s?.reminder_id ?? null,
  error: s?.error ?? '',
  generated_at: iso(s?.generated_at),
});

/** Segments in the order they were spoken. */
const ordered = (segments: StoredSegment[] | undefined) => [...(segments ?? [])].sort((a, b) => a.seq - b.seq);

/** "Agent: …" / "Lead: …" lines, which is also what the log search and the lead's Ask AI read. */
export const transcriptText = (segments: StoredSegment[] | undefined) =>
  ordered(segments)
    .map((s) => `${s.speaker === 'AGENT' ? 'Agent' : 'Lead'}: ${(s.text ?? '').trim()}`)
    .join('\n');

const TERMINAL_CALL = ['COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED'];
/** A live call older than this is stale (a missed hang-up callback), not one to restore. */
const ACTIVE_CALL_WINDOW_MS = 3 * 60 * 60 * 1000;
/** A summary run still PENDING after this long died mid-way and may be claimed again. */
const SUMMARY_CLAIM_TTL_MS = 5 * 60 * 1000;

/** A stored log as `toObject()` gives it, with the timestamps the schema adds. */
type LogRow = CommunicationLogDoc & { created_at?: Date | null; updated_at?: Date | null };

const pub = (doc: { toObject(): unknown } | null) => (doc ? pubDoc(doc) : null);

function pubDoc(doc: { toObject(): unknown }) {
  const o = doc.toObject() as LogRow;
  const meta: Meta = o.metadata ?? {};
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
    transcript_segments: ordered(o.transcript_segments).map(pubSegment),
    summary: pubSummary(o.summary),
    external_id: o.external_id ?? '',
    from_number: metaText(meta, 'from_number'),
    answered_at: metaText(meta, 'answered_at'),
    mode: metaText(meta, 'mode'),
    muted: meta.muted === true,
    on_hold: meta.on_hold === true,
    created_by: o.created_by ?? null,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
}

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
  /** Defaults to OUTBOUND: every log written before calls could be taken on a phone was one. */
  direction?: 'OUTBOUND' | 'INBOUND';
  /** Defaults to PENDING for a CALL (a recording is on its way) and NONE otherwise. */
  transcript_status?: 'NONE' | 'PENDING' | 'READY' | 'FAILED';
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
    const query: Record<string, unknown> = {};
    if (filter.entity_type) query.entity_type = filter.entity_type;
    if (filter.entity_id) query.entity_id = new Types.ObjectId(filter.entity_id);
    if (filter.type) query.type = filter.type;
    if (filter.status) query.status = filter.status;
    if (filter.search) {
      const rx = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
      query.$or = [
        { contact_value: rx },
        { contact_name: rx },
        { subject: rx },
        { body: rx },
        { transcript: rx },
      ];
    }
    if (filter.from_date || filter.to_date) {
      const range: { $gte?: Date; $lt?: Date } = {};
      if (filter.from_date) range.$gte = new Date(filter.from_date);
      if (filter.to_date) range.$lt = new Date(filter.to_date);
      query.created_at = range;
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

  /**
   * Raw `metadata` map for a log (the public `pub()` shape omits it). Used by
   * the AI-call webhook to read the chosen prompt_id / voice / running history.
   */
  async getMetadata(id: string): Promise<Record<string, unknown> | null> {
    try {
      const doc = await CommunicationLogModel.findById(id).lean<{ metadata?: Record<string, unknown> | null }>();
      return doc ? (doc.metadata ?? {}) : null;
    } catch {
      return null;
    }
  },

  /** Patch a log's call lifecycle fields (used by the Twilio status webhook). */
  async update(
    id: string,
    patch: {
      status?: string;
      external_id?: string | null;
      duration_seconds?: number | null;
      recording_url?: string | null;
      error_message?: string | null;
      direction?: string | null;
      metadata?: Record<string, unknown> | null;
    }
  ) {
    const doc = await CommunicationLogModel.findById(id);
    if (!doc) return null;
    if (patch.status != null) doc.set('status', patch.status);
    if (patch.external_id != null && patch.external_id !== '') doc.external_id = patch.external_id;
    if (patch.duration_seconds != null) doc.duration_seconds = patch.duration_seconds;
    if (patch.recording_url != null && patch.recording_url !== '') doc.recording_url = patch.recording_url;
    if (patch.error_message != null) doc.error_message = patch.error_message;
    if (patch.direction != null) doc.set('direction', patch.direction);
    if (patch.metadata != null) doc.set('metadata', { ...(doc.metadata as Meta | null), ...patch.metadata });
    await doc.save();
    return pub(doc);
  },

  async create(input: CreateLogInput) {
    const doc = await CommunicationLogModel.create({
      type: input.type,
      direction: input.direction ?? 'OUTBOUND',
      entity_type: input.entity_type,
      entity_id: new Types.ObjectId(input.entity_id),
      provider_id: input.provider_id ? new Types.ObjectId(input.provider_id) : null,
      provider_name: input.provider_name ?? '',
      contact_name: input.contact_name ?? '',
      contact_value: input.contact_value,
      subject: input.subject ?? '',
      body: input.body ?? '',
      status: input.status ?? 'QUEUED',
      error_message: input.error_message ?? '',
      duration_seconds: input.duration_seconds ?? 0,
      recording_url: input.recording_url ?? '',
      external_id: input.external_id ?? '',
      transcript_status: input.transcript_status ?? (input.type === 'CALL' ? 'PENDING' : 'NONE'),
      created_by: input.created_by ?? null,
      metadata: input.metadata ?? {},
    });
    return pubDoc(doc);
  },

  /**
   * Store one finished utterance. The filter refuses a segment already stored
   * under the same `seq` + `track`, so a webhook Twilio retries adds nothing.
   * Returns whether it was new.
   */
  async appendTranscriptSegment(
    id: string,
    segment: { seq: number; track: string; speaker: CallSpeaker; text: string; confidence: number | null; at: Date | null }
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const res = await CommunicationLogModel.updateOne(
      { _id: id, transcript_segments: { $not: { $elemMatch: { seq: segment.seq, track: segment.track } } } },
      { $push: { transcript_segments: segment } }
    );
    return res.modifiedCount > 0;
  },

  /** Turn the live segments into the log's transcript text. Leaves a log with no segments untouched. */
  async finalizeLiveTranscript(id: string) {
    const doc = await CommunicationLogModel.findById(id);
    if (!doc?.transcript_segments?.length) return null;
    doc.transcript = transcriptText(doc.transcript_segments as StoredSegment[]);
    doc.transcript_status = 'READY';
    await doc.save();
    return pubDoc(doc);
  },

  /**
   * Claim the summary run for this log: only one run at a time, and an
   * automatic run never redoes a summary that is already READY.
   */
  async claimSummary(id: string, opts: { force: boolean }) {
    const blocked: SummaryStatus[] = opts.force ? ['PENDING'] : ['PENDING', 'READY'];
    // A run that died mid-way (server restart) must not block the summary forever.
    const abandoned = new Date(Date.now() - SUMMARY_CLAIM_TTL_MS);
    const doc = await CommunicationLogModel.findOneAndUpdate(
      {
        _id: id,
        type: 'CALL',
        $or: [{ 'summary.status': { $nin: blocked } }, { 'summary.status': 'PENDING', 'summary.claimed_at': { $lt: abandoned } }],
      },
      { $set: { 'summary.status': 'PENDING', 'summary.error': '', 'summary.claimed_at': new Date() } },
      { new: true }
    );
    return pub(doc);
  },

  async saveSummary(
    id: string,
    summary: { text: string; key_points: string[]; sentiment: CallSentiment | null; outcome: string; follow_ups: string[] }
  ) {
    const doc = await CommunicationLogModel.findByIdAndUpdate(
      id,
      {
        $set: {
          'summary.status': 'READY',
          'summary.text': summary.text,
          'summary.key_points': summary.key_points,
          'summary.sentiment': summary.sentiment,
          'summary.outcome': summary.outcome,
          'summary.follow_ups': summary.follow_ups,
          'summary.error': '',
          'summary.generated_at': new Date(),
        },
      },
      { new: true }
    );
    return pub(doc);
  },

  /** Record the follow-up reminder once; a later run finds it set and adds no second one. */
  async setSummaryReminder(id: string, reminderId: string) {
    const res = await CommunicationLogModel.updateOne(
      { _id: id, 'summary.reminder_id': null },
      { $set: { 'summary.reminder_id': reminderId } }
    );
    return res.modifiedCount > 0;
  },

  async failSummary(id: string, error: string) {
    await CommunicationLogModel.updateOne(
      { _id: id },
      { $set: { 'summary.status': 'FAILED', 'summary.error': error.slice(0, 500) } }
    );
  },

  /** The agent's most recent call that is still live, if any (restores the call window after a reload). */
  async activeCallFor(userId: string) {
    const doc = await CommunicationLogModel.findOne({
      created_by: userId,
      type: 'CALL',
      status: { $nin: TERMINAL_CALL },
      created_at: { $gte: new Date(Date.now() - ACTIVE_CALL_WINDOW_MS) },
    }).sort({ created_at: -1 });
    return pub(doc);
  },

  /** Store a transcript produced outside Twilio (a recording the CRM app uploaded), or the reason there is none. */
  async saveTranscript(id: string, result: { transcript?: string | null; error?: string | null }) {
    const text = (result.transcript ?? '').trim();
    const set: Record<string, unknown> = text
      ? { transcript: text, transcript_status: 'READY' }
      : { transcript_status: 'FAILED', error_message: (result.error ?? 'No transcript was produced').slice(0, 500) };
    const doc = await CommunicationLogModel.findByIdAndUpdate(id, { $set: set }, { new: true });
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
