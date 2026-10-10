import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { PodChallengeModel, type PodChallengeDoc } from './podChallenge.model';
import { ChallengeAuditLogModel, ChallengeResultModel } from './challengeLedger.model';
import { getUrlConfigs } from '@config/url-configs';
import { ChallengeNotificationModel, challengeLiveLink } from './podChallenge.notify';

/**
 * Challenge Portal's staff views over every pod challenge: the Pod Challenges
 * list (and its Live Monitor / Results filters), the audit trail and the
 * notification ledger. Read-only: staff act on a challenge through the same
 * guarded mutations a host uses.
 */

type Stamped = PodChallengeDoc & { created_at?: Date; updated_at?: Date };

interface AuditRow {
  _id: Types.ObjectId;
  challenge_id: Types.ObjectId;
  actor_id?: Types.ObjectId | null;
  action: string;
  reason?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  created_at?: Date;
}

interface NoticeBatchRow {
  _id: { challenge_id: Types.ObjectId; kind: string; version: number };
  recipients: number;
  whatsapp: number;
  email: number;
  last_at: Date;
}

interface NamedUser {
  _id: Types.ObjectId;
  profile?: { first_name?: string | null; last_name?: string | null } | null;
}

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

const CHALLENGE_TABLE: TableEntityConfig = {
  searchFields: ['name'],
  sortFields: {
    name: 'name',
    status: 'status',
    started_at: 'started_at',
    completed_at: 'completed_at',
    updated_at: 'updated_at',
    created_at: 'created_at',
  },
  filterFields: {
    name: { type: 'string' },
    status: { type: 'enum' },
    enabled: { type: 'boolean' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
  defaultSort: { updated_at: -1 },
};

const AUDIT_TABLE: TableEntityConfig = {
  searchFields: ['action', 'reason'],
  sortFields: { created_at: 'created_at', action: 'action' },
  filterFields: { action: { type: 'string' }, created_at: { type: 'date' } },
  defaultSort: { created_at: -1 },
};

async function titlesOf(podIds: Types.ObjectId[]) {
  // A challenge outlives its pod's soft delete; its history must still name it.
  const pods = await PodModel.find({ _id: { $in: podIds } })
    .setOptions({ includeDeleted: true })
    .select('pod_title')
    .lean();
  return new Map(pods.map((p) => [String(p._id), p.pod_title]));
}

async function namesOf(userIds: unknown[]) {
  const ids = [...new Set(userIds.filter(Boolean).map(String))];
  if (!ids.length) return new Map<string, string>();
  const users = await UserModel.find({ _id: { $in: ids } }).select('profile.first_name profile.last_name').lean<NamedUser[]>();
  return new Map(
    users.map((u) => [u._id.toString(), `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim()])
  );
}

export const podChallengeAdmin = {
  /** @param statuses when given, only challenges in these statuses (Live Monitor, Results). */
  async table(input: TableQueryInput | null | undefined, statuses?: string[] | null) {
    const base = statuses?.length ? { status: { $in: statuses } } : {};
    const { docs, total, page, page_size } = await runTableQuery<Stamped>(PodChallengeModel, base, input, CHALLENGE_TABLE, {
      projection: { tool_state: 0, players: 0, judge_user_ids: 0 },
    });
    const [{ mwebUrl }, titles, results] = await Promise.all([
      getUrlConfigs(),
      titlesOf(docs.map((d) => d.pod_id)),
      ChallengeResultModel.find({ challenge_id: { $in: docs.map((d) => d._id) }, is_current: true })
        .select('challenge_id winner_ids standings.competitor_id standings.name published_at')
        .lean(),
    ]);
    const resultOf = new Map(results.map((r) => [String(r.challenge_id), r]));
    const rows = docs.map((d) => {
      const result = resultOf.get(String(d._id));
      const winners = (result?.standings ?? []).filter((s) => result?.winner_ids.includes(String(s.competitor_id))).map((s) => s.name);
      return {
        id: String(d._id),
        pod_id: String(d.pod_id),
        pod_title: titles.get(String(d.pod_id)) ?? '',
        name: d.name,
        live_url: challengeLiveLink(mwebUrl, d),
        status: d.status,
        enabled: !!d.enabled,
        show_on_pod_details: !!d.show_on_pod_details,
        participant_mode: d.participant_mode,
        tool_count: d.tools?.length ?? 0,
        competitor_count: d.competitors?.length ?? 0,
        result_version: d.result_version ?? 0,
        winners: winners.join(', '),
        published_at: iso(result?.published_at),
        started_at: iso(d.started_at),
        completed_at: iso(d.completed_at),
        updated_at: iso(d.updated_at) ?? '',
        created_at: iso(d.created_at) ?? '',
      };
    });
    return { rows, total, page, page_size };
  },

  async auditTable(input: TableQueryInput | null | undefined, challengeId?: string | null) {
    const base = challengeId && Types.ObjectId.isValid(challengeId) ? { challenge_id: new Types.ObjectId(challengeId) } : {};
    const { docs, total, page, page_size } = await runTableQuery<AuditRow>(ChallengeAuditLogModel, base, input, AUDIT_TABLE);
    const [actors, challenges] = await Promise.all([
      namesOf(docs.map((d) => d.actor_id)),
      PodChallengeModel.find({ _id: { $in: docs.map((d) => d.challenge_id) } }).select('name').lean(),
    ]);
    const challengeName = new Map(challenges.map((c) => [String(c._id), c.name]));
    const rows = docs.map((d) => ({
      id: String(d._id),
      challenge_id: String(d.challenge_id),
      challenge_name: challengeName.get(String(d.challenge_id)) ?? '',
      action: d.action,
      actor_name: d.actor_id ? (actors.get(String(d.actor_id)) ?? '') : '',
      reason: d.reason ?? '',
      old_value_json: JSON.stringify(d.old_value ?? null),
      new_value_json: JSON.stringify(d.new_value ?? null),
      created_at: iso(d.created_at) ?? '',
    }));
    return { rows, total, page, page_size };
  },

  /** The latest notification batches across every challenge (one row per challenge, notice and version). */
  async notifications(limit = 200) {
    const batches = await ChallengeNotificationModel.aggregate<NoticeBatchRow>([
      {
        $group: {
          _id: { challenge_id: '$challenge_id', kind: '$kind', version: '$version' },
          recipients: { $sum: 1 },
          whatsapp: { $sum: { $cond: ['$whatsapp', 1, 0] } },
          email: { $sum: { $cond: ['$email', 1, 0] } },
          last_at: { $max: '$created_at' },
        },
      },
      { $sort: { last_at: -1 } },
      { $limit: Math.min(Math.max(limit, 1), 500) },
    ]);
    const challenges = await PodChallengeModel.find({ _id: { $in: batches.map((b) => b._id.challenge_id) } })
      .select('name pod_id')
      .lean();
    const byId = new Map(challenges.map((c) => [String(c._id), c]));
    const titles = await titlesOf(challenges.map((c) => c.pod_id));
    return batches.map((b) => {
      const challenge = byId.get(String(b._id.challenge_id));
      return {
        id: `${String(b._id.challenge_id)}:${b._id.kind}:${b._id.version}`,
        challenge_id: String(b._id.challenge_id),
        challenge_name: challenge?.name ?? '',
        pod_title: challenge ? (titles.get(String(challenge.pod_id)) ?? '') : '',
        kind: b._id.kind,
        version: b._id.version,
        recipients: b.recipients,
        whatsapp: b.whatsapp,
        email: b.email,
        last_sent_at: iso(b.last_at) ?? '',
      };
    });
  },

  async stats() {
    const [total, live, completed, published] = await Promise.all([
      PodChallengeModel.countDocuments({}),
      PodChallengeModel.countDocuments({ status: { $in: ['LIVE', 'PAUSED'] } }),
      PodChallengeModel.countDocuments({ status: { $in: ['COMPLETED', 'ARCHIVED'] } }),
      PodChallengeModel.countDocuments({ result_version: { $gt: 0 } }),
    ]);
    return { total, live, completed, published };
  },
};
