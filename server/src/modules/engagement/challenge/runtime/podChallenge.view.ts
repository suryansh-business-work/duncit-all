import { ChallengeResultModel, ChallengeScoreEventModel, ChallengeVoteModel } from './challengeLedger.model';
import { computeStandings, winnersOf, type Standing, type WinnerRules } from './challenge.standings';
import { allowedActions } from './challenge.lifecycle';
import { isJudge, type ChallengeAccess, type PodRef } from './podChallenge.access';
import type { PodChallengeDoc } from './podChallenge.model';

/**
 * The single read model of a pod challenge, shaped per viewer. Live standings
 * are recomputed from the ledgers on every read (they are small and this keeps
 * the server the only authority). Once completed, non-managers see the
 * PUBLISHED result only — a provisional ranking is never shown as final.
 */

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

function clockElapsed(state: { clock_running?: boolean | null; clock_started_at?: Date | null; clock_elapsed_ms?: number | null }, now: number) {
  const base = state.clock_elapsed_ms ?? 0;
  return state.clock_running && state.clock_started_at ? base + (now - new Date(state.clock_started_at).getTime()) : base;
}

const standingPub = (s: Standing) => ({
  competitor_id: s.competitor_id,
  name: s.name,
  rank: s.rank,
  total: s.total,
  metrics_json: JSON.stringify(s.metrics ?? {}),
});

export async function liveStandings(doc: PodChallengeDoc) {
  const [events, votes] = await Promise.all([
    ChallengeScoreEventModel.find({ challenge_id: doc._id, voided: false })
      .select('tool_instance_id competitor_id event_type value')
      .sort({ created_at: 1 })
      .lean(),
    ChallengeVoteModel.find({ challenge_id: doc._id }).select('tool_instance_id kind candidate_id value criteria').lean(),
  ]);
  return computeStandings({
    tools: doc.tools.map((t) => ({ ...t, config: (t.config ?? {}) as Record<string, unknown> })),
    competitors: doc.competitors,
    events,
    votes: votes.map((v) => ({ ...v, criteria: v.criteria?.map((c) => ({ key: c.key ?? '', value: c.value ?? 0 })) })),
    rules: doc.winner_rules as WinnerRules,
  });
}

async function myVotes(doc: PodChallengeDoc, userId: string | undefined) {
  if (!userId) return [];
  const votes = await ChallengeVoteModel.find({ challenge_id: doc._id, voter_id: userId, round: doc.current_round })
    .select('tool_instance_id kind candidate_id value criteria')
    .lean();
  return votes.map((v) => ({ tool_instance_id: v.tool_instance_id, kind: v.kind, candidate_id: v.candidate_id, value: v.value }));
}

export async function toView(
  doc: PodChallengeDoc,
  pod: PodRef,
  access: ChallengeAccess,
  userId: string | undefined,
  eligibilityWarning = false
) {
  const now = Date.now();
  const result = doc.result_version
    ? await ChallengeResultModel.findOne({ challenge_id: doc._id, is_current: true }).lean()
    : null;
  const finished = doc.status === 'COMPLETED' || doc.status === 'ARCHIVED';
  const hideLive = finished && !access.canManage;
  const standings = hideLive ? [] : await liveStandings(doc);
  const judge = isJudge(doc, userId);
  const live = doc.status === 'LIVE';

  return {
    id: doc._id.toString(),
    pod_id: pod._id.toString(),
    pod_title: pod.pod_title,
    template_id: doc.template_id.toString(),
    name: doc.name,
    participant_mode: doc.participant_mode,
    status: doc.status,
    enabled: doc.enabled,
    show_on_pod_details: doc.show_on_pod_details,
    audience_interaction_enabled: doc.audience_interaction_enabled,
    auto_whatsapp: doc.auto_whatsapp,
    auto_email: doc.auto_email,
    scheduled_for: iso(doc.scheduled_for),
    started_at: iso(doc.started_at),
    completed_at: iso(doc.completed_at),
    updated_at: iso((doc as { updated_at?: Date }).updated_at) ?? '',
    server_now: new Date(now).toISOString(),
    revision: doc.revision,
    current_round: doc.current_round,
    tools: doc.tools.map((t) => {
      const state = doc.tool_state.find((s) => s.instance_id === t.instance_id);
      return {
        instance_id: t.instance_id,
        tool_type: t.tool_type,
        label: t.label,
        config_json: JSON.stringify(t.config ?? {}),
        clock_running: !!state?.clock_running,
        clock_elapsed_ms: state ? clockElapsed(state, now) : 0,
        voting_open: !!state?.voting_open,
      };
    }),
    competitors: doc.competitors.map((c) => ({
      competitor_id: c.competitor_id,
      name: c.name,
      user_id: c.user_id ? c.user_id.toString() : null,
    })),
    players: doc.players.map((p) => ({ player_id: p.player_id, name: p.name, team_id: p.team_id })),
    judge_user_ids: access.canManage ? doc.judge_user_ids.map(String) : [],
    standings: standings.map(standingPub),
    live_winner_ids: hideLive ? [] : winnersOf(standings),
    result: result
      ? {
          version: result.version,
          published_at: result.published_at.toISOString(),
          reason: result.reason ?? '',
          winner_ids: result.winner_ids,
          standings: result.standings.map((s) => standingPub(s as Standing)),
        }
      : null,
    eligibility_warning: access.canManage && eligibilityWarning,
    viewer: {
      can_manage: access.canManage,
      is_staff: access.isStaff,
      is_attendee: access.isAttendee,
      is_judge: judge,
      can_interact: live && doc.audience_interaction_enabled && access.isAttendee,
      can_judge: live && judge,
      allowed_actions: access.canManage ? allowedActions(doc.status) : [],
      my_votes: await myVotes(doc, userId),
    },
  };
}
