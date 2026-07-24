import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { UserModel } from '@modules/access/user/user.model';
import { ClubModel } from '@modules/pods/club/club.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  PodAuditLogModel,
  type IPodAuditChange,
  type IPodAuditLog,
  type PodAuditAction,
  type PodAuditRisk,
  type PodAuditSource,
} from './podAudit.model';

/** Pod fields the audit trail diffs — one line per changed field. */
const TRACKED_FIELDS = [
  'pod_title',
  'pod_description',
  'pod_type',
  'pod_amount',
  'pod_mode',
  'pod_date_time',
  'pod_end_date_time',
  'pod_occurrence',
  'no_of_spots',
  'venue_id',
  'venue_slot_id',
  'location_id',
  'zone_name',
  'club_id',
  'is_active',
  'venue_approval_status',
] as const;

export type PodAuditSnapshot = Record<string, string>;

const asText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'object' ? (value as { toString(): string }).toString() : String(value);
};

/** Compact string snapshot of the tracked fields of a pod doc. */
export function snapshotPod(doc: any): PodAuditSnapshot {
  const snap: PodAuditSnapshot = {};
  for (const field of TRACKED_FIELDS) snap[field] = asText(doc?.[field]);
  return snap;
}

/** Field-level diff between two snapshots (empty for a no-op edit). */
export function diffSnapshots(before: PodAuditSnapshot, after: PodAuditSnapshot): IPodAuditChange[] {
  const changes: IPodAuditChange[] = [];
  for (const field of TRACKED_FIELDS) {
    const from = before[field] ?? '';
    const to = after[field] ?? '';
    if (from !== to) changes.push({ field, from, to });
  }
  return changes;
}

const changed = (changes: IPodAuditChange[], field: string) =>
  changes.find((c) => c.field === field);

/**
 * Deterministic risk baseline — always applied, so monitoring stays useful
 * even when the OpenAI key is not configured. The async AI review can raise
 * or refine it, never depend on it.
 */
export function heuristicRisk(action: PodAuditAction, changes: IPodAuditChange[]): PodAuditRisk {
  if (action === 'DELETE') return 'HIGH';
  if (action === 'VENUE_DECLINED') return 'MEDIUM';
  const amount = changed(changes, 'pod_amount');
  if (amount) {
    const from = Number(amount.from) || 0;
    const to = Number(amount.to) || 0;
    // A big price move (or pricing a free pod) is the classic risky edit.
    if (from === 0 || to === 0 || Math.abs(to - from) > from * 0.5) return 'HIGH';
    return 'MEDIUM';
  }
  if (changed(changes, 'pod_date_time') || changed(changes, 'venue_id') || changed(changes, 'club_id')) {
    return 'MEDIUM';
  }
  if (changed(changes, 'is_active')) return 'MEDIUM';
  return 'LOW';
}

/** One-line deterministic summary used when AI is unavailable. */
export function heuristicSummary(log: Pick<IPodAuditLog, 'action' | 'changes' | 'note'>): string {
  const fields = log.changes.map((c) => c.field).join(', ');
  const base = fields ? `${log.action} touching ${fields}` : log.action;
  return log.note ? `${base} — ${log.note}` : base;
}

const AI_SYSTEM_PROMPT = [
  'You are the audit monitor for Duncit, a platform where hosts run social events ("pods").',
  'You are given one recorded pod action (who did it, what changed, context note).',
  'Assess how risky the action is for attendees/finances: LOW (routine), MEDIUM (notable — reschedules, venue moves, activation flips), HIGH (refund-relevant: deletions, big price changes, suspicious edits).',
  'Return STRICT JSON only, no markdown, of shape {"risk":"LOW"|"MEDIUM"|"HIGH","summary":string}.',
  'The summary is ONE sentence for an operations dashboard describing what happened and why it matters.',
].join('\n');

function buildAiUserContent(log: IPodAuditLog): string {
  const lines = [
    `Action: ${log.action} (by ${log.source})`,
    `Pod: ${log.pod_title || String(log.pod_id)}`,
    ...log.changes.map((c) => `Changed ${c.field}: "${c.from}" -> "${c.to}"`),
  ];
  if (log.note) lines.push(`Note: ${log.note}`);
  return lines.join('\n');
}

/** Parse the strict-JSON AI verdict; null on any shape mismatch. */
export function parseAiVerdict(content: string): { risk: PodAuditRisk; summary: string } | null {
  try {
    const parsed = JSON.parse(content) as { risk?: unknown; summary?: unknown };
    const risk = typeof parsed.risk === 'string' ? parsed.risk.toUpperCase() : '';
    if (risk !== 'LOW' && risk !== 'MEDIUM' && risk !== 'HIGH') return null;
    return { risk, summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 1000) : '' };
  } catch {
    return null;
  }
}

/**
 * Best-effort AI enrichment of a stored entry (same pattern as moderation.ai):
 * no key / HTTP failure / bad JSON all fall back to the heuristic verdict the
 * entry already carries — an AI outage never blocks or degrades auditing.
 */
export async function reviewLogWithAi(log: IPodAuditLog): Promise<void> {
  try {
    const [apiKey, baseUrl] = await Promise.all([
      getRuntimeEnvValue('OPENAI_API_KEY'),
      getRuntimeEnvValue('OPENAI_BASE_URL'),
    ]);
    const fallbackSummary = log.ai_summary || heuristicSummary(log);
    let risk = log.ai_risk === 'PENDING' ? heuristicRisk(log.action, log.changes) : log.ai_risk;
    let summary = fallbackSummary;
    if (apiKey) {
      const base = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 200,
          response_format: { type: 'json_object' as const },
          messages: [
            { role: 'system', content: AI_SYSTEM_PROMPT },
            { role: 'user', content: buildAiUserContent(log) },
          ],
        }),
      });
      if (res.ok) {
        const json: any = await res.json();
        const verdict = parseAiVerdict(String(json?.choices?.[0]?.message?.content ?? ''));
        if (verdict) {
          risk = verdict.risk;
          summary = verdict.summary || fallbackSummary;
        }
      }
    }
    log.ai_risk = risk;
    log.ai_summary = summary;
    log.ai_reviewed_at = new Date();
    await log.save();
  } catch {
    // Swallow everything — enrichment is strictly best-effort.
  }
}

const actorName = async (actorUserId?: string | null): Promise<string> => {
  if (!actorUserId || !Types.ObjectId.isValid(actorUserId)) return '';
  const user = await UserModel.findById(actorUserId)
    .select('profile.first_name profile.last_name auth.email')
    .lean();
  const name = `${(user as any)?.profile?.first_name ?? ''} ${(user as any)?.profile?.last_name ?? ''}`.trim();
  return name || (user as any)?.auth?.email || '';
};

export interface RecordPodAuditInput {
  pod: any;
  action: PodAuditAction;
  source: PodAuditSource;
  actorUserId?: string | null;
  before?: PodAuditSnapshot | null;
  note?: string | null;
}

const toPub = (d: IPodAuditLog) => ({
  id: String(d._id),
  pod_id: String(d.pod_id),
  pod_title: d.pod_title,
  club_id: d.club_id ? String(d.club_id) : null,
  actor_user_id: d.actor_user_id ? String(d.actor_user_id) : null,
  actor_name: d.actor_name,
  source: d.source,
  action: d.action,
  changes: (d.changes ?? []).map((c) => ({ field: c.field, from: c.from, to: c.to })),
  note: d.note ?? '',
  ai_risk: d.ai_risk,
  ai_summary: d.ai_summary ?? '',
  ai_reviewed_at: d.ai_reviewed_at ? d.ai_reviewed_at.toISOString() : null,
  created_at: d.created_at?.toISOString?.() ?? '',
});

/** Allowlists for the shared table engine (podAuditLogsTable — DUNCIT TABLE CONTRACT v1). */
const POD_AUDIT_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['pod_title', 'actor_name', 'ai_summary'],
  sortFields: {
    created_at: 'created_at',
    action: 'action',
    source: 'source',
    ai_risk: 'ai_risk',
    pod_title: 'pod_title',
  },
  filterFields: {
    action: { type: 'enum' },
    source: { type: 'enum' },
    ai_risk: { type: 'enum' },
    pod_id: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export const podAuditService = {
  /**
   * Append one immutable audit entry (best-effort — a logging failure must
   * never fail the pod mutation). The entry lands instantly with the
   * deterministic risk; the AI review enriches it in the background.
   */
  async record(input: RecordPodAuditInput): Promise<void> {
    try {
      const after = snapshotPod(input.pod);
      const changes = input.before ? diffSnapshots(input.before, after) : [];
      // A no-op save (nothing actually changed) is not an auditable event.
      if (input.before && input.action === 'UPDATE' && changes.length === 0) return;
      const log = await PodAuditLogModel.create({
        pod_id: input.pod._id,
        pod_title: input.pod.pod_title ?? '',
        club_id: input.pod.club_id ?? null,
        actor_user_id:
          input.actorUserId && Types.ObjectId.isValid(input.actorUserId)
            ? new Types.ObjectId(input.actorUserId)
            : null,
        actor_name: await actorName(input.actorUserId),
        source: input.source,
        action: input.action,
        changes,
        note: (input.note ?? '').trim().slice(0, 1000),
        ai_risk: heuristicRisk(input.action, changes),
        ai_summary: heuristicSummary({ action: input.action, changes, note: (input.note ?? '').trim() } as any),
      });
      reviewLogWithAi(log).catch(() => undefined);
    } catch (err) {
      logs.server.error('podAudit', 'record', { error: err, msg: 'record failed' });
    }
  },

  /** Admin: server-side table page over every audit entry. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IPodAuditLog>(
      PodAuditLogModel,
      {},
      input,
      POD_AUDIT_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /** Club admin: same table scoped to the clubs the actor administers
   * (SUPER_ADMIN sees everything). */
  async tableForClubAdmin(actor: { id: string; roles?: string[] }, input?: TableQueryInput | null) {
    let baseFilter: Record<string, unknown> = {};
    if (!actor.roles?.includes('SUPER_ADMIN')) {
      const clubs = await ClubModel.find({ admin_user_ids: new Types.ObjectId(actor.id) }).select('_id');
      baseFilter = { club_id: { $in: clubs.map((c) => c._id) } };
    }
    const { docs, total, page, page_size } = await runTableQuery<IPodAuditLog>(
      PodAuditLogModel,
      baseFilter,
      input,
      POD_AUDIT_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /** Full trail of one pod, newest first. */
  async listForPod(podId: string) {
    if (!Types.ObjectId.isValid(podId)) return [];
    const docs = await PodAuditLogModel.find({ pod_id: new Types.ObjectId(podId) })
      // _id (a monotonic ObjectId) breaks created_at ties so rapid same-millisecond
      // events (e.g. CREATE then DELETE) still order newest-first deterministically.
      .sort({ created_at: -1, _id: -1 })
      .limit(200);
    return docs.map(toPub);
  },
};
