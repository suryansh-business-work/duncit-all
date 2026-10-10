import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { ChallengeModel } from '../challenge.model';
import { normalizeToolConfig, parseConfigJson, type ToolConfig } from '../tools/challengeTool.config';
import { PodChallengeModel, type PodChallengeDoc } from './podChallenge.model';
import { accessFor, assertManage, assertView, canView, loadPod, type PodRef } from './podChallenge.access';
import { eligibleTemplates, podEligibility, templateEligible } from './podChallenge.eligibility';
import { CHALLENGE_STATUSES, nextStatus, type ChallengeAction, type ChallengeStatus } from './challenge.lifecycle';
import { commit, loadChallenge } from './podChallenge.commit';
import { toView } from './podChallenge.view';
import { podChallengeNotify } from './podChallenge.notify';
import {
  assertRemovable,
  buildCompetitors,
  buildJudges,
  buildPlayers,
  type CompetitorInput,
  type PlayerInput,
  type RosterLimits,
} from './podChallenge.roster';

export interface CreatePodChallengeInput {
  pod_id: string;
  template_id: string;
  name?: string | null;
  tool_overrides?: { instance_id: string; config_json: string }[] | null;
}

export interface PodChallengeSettingsInput {
  name?: string | null;
  enabled?: boolean | null;
  show_on_pod_details?: boolean | null;
  audience_interaction_enabled?: boolean | null;
  auto_whatsapp?: boolean | null;
  auto_email?: boolean | null;
  scheduled_for?: string | null;
}

export interface RosterInput {
  competitors: CompetitorInput[];
  players?: PlayerInput[] | null;
  judge_user_ids?: string[] | null;
}

const OPEN: readonly ChallengeStatus[] = ['DRAFT', 'SCHEDULED', 'LIVE', 'PAUSED'];
const STATE_TOOLS = new Set(['TIMER', 'VOTING', 'RATING']);

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

async function managed(challengeId: string, user: AuthUser) {
  const doc = await loadChallenge(challengeId);
  const pod = await loadPod(doc.pod_id.toString());
  const access = await accessFor(user, pod);
  assertManage(access);
  return { doc, pod, access };
}

function limitsFor(doc: Pick<PodChallengeDoc, 'tools'>, maxCompetitors: number): RosterLimits {
  const team = doc.tools.find((t) => t.tool_type === 'TEAM_MANAGER')?.config as ToolConfig | undefined;
  return {
    maxCompetitors,
    maxTeams: Number(team?.max_teams ?? 0),
    maxPlayersPerTeam: Number(team?.max_players_per_team ?? 0),
  };
}

function applyOverrides(tools: PodChallengeDoc['tools'], overrides: CreatePodChallengeInput['tool_overrides']) {
  const byId = new Map((overrides ?? []).map((o) => [o.instance_id, parseConfigJson(o.config_json)]));
  return tools.map((t) => ({
    ...t,
    config: byId.has(t.instance_id)
      ? normalizeToolConfig(t.tool_type, t.config as ToolConfig, byId.get(t.instance_id))
      : t.config,
  }));
}

async function viewOf(doc: PodChallengeDoc, pod: PodRef, user: AuthUser | null) {
  const access = await accessFor(user, pod);
  return toView(doc, pod, access, user?.id);
}

export const podChallengeService = {
  /** What the host may set up on this pod (Host Studio + pod form). */
  async setup(podId: string, user: AuthUser) {
    const pod = await loadPod(podId);
    assertManage(await accessFor(user, pod));
    const eligibility = await podEligibility(pod);
    const templates = await eligibleTemplates(eligibility);
    const m = eligibility.mapping;
    return {
      pod_id: podId,
      enabled: !!m?.enabled,
      require_challenge: !!m?.require_challenge,
      allow_host_customization: !!m?.allow_host_customization,
      default_template_id: m?.default_template_id ?? null,
      template_ids: templates.map((t) => t._id.toString()),
    };
  },

  async listForPod(podId: string, user: AuthUser | null) {
    const pod = await loadPod(podId);
    const access = await accessFor(user, pod);
    const docs = await PodChallengeModel.find({ pod_id: pod._id }).sort({ created_at: 1 }).lean<PodChallengeDoc[]>();
    const visible = docs.filter((d) => canView(d, access, user?.id));
    const eligibility = access.canManage ? await podEligibility(pod) : null;
    const templates = eligibility
      ? await ChallengeModel.find({ _id: { $in: visible.map((d) => d.template_id) } }).lean()
      : [];
    return Promise.all(
      visible.map((d) => {
        const tpl = templates.find((t) => t._id.equals(d.template_id));
        const warning = !!eligibility && OPEN.includes(d.status as ChallengeStatus) && !(tpl && templateEligible(tpl, eligibility));
        return toView(d, pod, access, user?.id, warning);
      })
    );
  },

  async get(challengeId: string, user: AuthUser | null) {
    const doc = await loadChallenge(challengeId);
    const pod = await loadPod(doc.pod_id.toString());
    const access = await accessFor(user, pod);
    assertView(doc, access, user?.id);
    return toView(doc, pod, access, user?.id);
  },

  async create(input: CreatePodChallengeInput, user: AuthUser) {
    const pod = await loadPod(input.pod_id);
    assertManage(await accessFor(user, pod));
    if (!Types.ObjectId.isValid(input.template_id)) bad('Invalid template id');
    const eligibility = await podEligibility(pod);
    const tpl = await ChallengeModel.findById(input.template_id).lean();
    if (!tpl || !templateEligible(tpl, eligibility)) bad("This template is not available for this pod's category");
    if (input.tool_overrides?.length && !eligibility.mapping?.allow_host_customization) {
      bad('Hosts cannot customise tools for this category');
    }
    const tools = applyOverrides(tpl.tool_instances as PodChallengeDoc['tools'], input.tool_overrides);
    const doc = await PodChallengeModel.create({
      pod_id: pod._id,
      template_id: tpl._id,
      name: input.name?.trim() || tpl.name,
      participant_mode: tpl.participant_mode,
      tools,
      winner_rules: tpl.winner_rules,
      tool_state: tools.filter((t) => STATE_TOOLS.has(t.tool_type)).map((t) => ({ instance_id: t.instance_id })),
      show_on_pod_details: eligibility.mapping?.show_on_pod_details_default ?? true,
      audience_interaction_enabled: eligibility.mapping?.allow_audience_voting ?? false,
      created_by: user.id,
    });
    const created = doc.toObject() as PodChallengeDoc;
    await commit(created, { statuses: ['DRAFT'] }, {}, { actorId: user.id, action: 'CREATE', newValue: { template_id: input.template_id } });
    return viewOf(await loadChallenge(created._id.toString()), pod, user);
  },

  /** The three independent switches plus name, schedule and notification flags. */
  async updateSettings(challengeId: string, input: PodChallengeSettingsInput, user: AuthUser) {
    const { doc, pod } = await managed(challengeId, user);
    if (input.enabled === false && doc.status === 'LIVE') {
      bad('Pause or end the live challenge before turning it off');
    }
    const set: Record<string, unknown> = {};
    if (input.name !== undefined && input.name !== null) {
      if (!input.name.trim()) bad('A challenge name is required');
      set.name = input.name.trim().slice(0, 80);
    }
    for (const key of ['enabled', 'show_on_pod_details', 'audience_interaction_enabled', 'auto_whatsapp', 'auto_email'] as const) {
      if (typeof input[key] === 'boolean') set[key] = input[key];
    }
    if (input.scheduled_for !== undefined) {
      const when = input.scheduled_for ? new Date(input.scheduled_for) : null;
      if (when && Number.isNaN(when.getTime())) bad('Invalid schedule time');
      set.scheduled_for = when;
    }
    // The enabled guard is re-checked atomically: a challenge that went live
    // after our read cannot be switched off by this write.
    const statuses = CHALLENGE_STATUSES.filter((st) => input.enabled !== false || st !== 'LIVE');
    const next = await commit(doc, { statuses }, { $set: set }, {
      actorId: user.id,
      action: 'SETTINGS',
      oldValue: Object.fromEntries(Object.keys(set).map((k) => [k, (doc as Record<string, unknown>)[k]])),
      newValue: set,
    });
    return viewOf(next, pod, user);
  },

  async setRoster(challengeId: string, input: RosterInput, user: AuthUser) {
    const { doc, pod } = await managed(challengeId, user);
    if (!OPEN.includes(doc.status as ChallengeStatus)) bad('The roster of a finished challenge cannot change');
    const eligibility = await podEligibility(pod);
    const limits = limitsFor(doc, eligibility.mapping?.max_competitors ?? 0);
    const competitors = await buildCompetitors(pod, input.competitors, limits);
    const ids = competitors.map((c) => c.competitor_id);
    await assertRemovable(doc._id, doc.competitors.map((c) => c.competitor_id).filter((id) => !ids.includes(id)));
    const players = doc.participant_mode === 'TEAM' ? await buildPlayers(pod, input.players ?? [], ids, limits) : [];
    const judges = input.judge_user_ids ? await buildJudges(pod, input.judge_user_ids) : doc.judge_user_ids;
    const next = await commit(
      doc,
      { statuses: OPEN },
      { $set: { competitors, players, judge_user_ids: judges } },
      { actorId: user.id, action: 'ROSTER', newValue: { competitors: ids.length, players: players.length, judges: judges.length } }
    );
    return viewOf(next, pod, user);
  },

  async transition(challengeId: string, action: ChallengeAction, user: AuthUser) {
    const { doc, pod } = await managed(challengeId, user);
    const to = nextStatus(doc.status, action);
    if (action === 'START') {
      if (!doc.enabled) bad('Turn the challenge on before starting it');
      if (!doc.tools.length) bad('This challenge has no tools to run');
      if (doc.competitors.length < 1) bad('Add at least one competitor before starting');
    }
    const now = new Date();
    const set: Record<string, unknown> = { status: to };
    if (action === 'START') set.started_at = now;
    if (action === 'COMPLETE' || action === 'CANCEL') set.completed_at = now;
    // Leaving LIVE stops every clock (folding the elapsed time in) and, when
    // play ends, closes every open vote.
    if (doc.status === 'LIVE' && to !== 'LIVE') {
      set.tool_state = doc.tool_state.map((s) => ({
        ...s,
        clock_running: false,
        clock_started_at: null,
        clock_elapsed_ms:
          s.clock_running && s.clock_started_at
            ? (s.clock_elapsed_ms ?? 0) + (now.getTime() - new Date(s.clock_started_at).getTime())
            : (s.clock_elapsed_ms ?? 0),
        voting_open: to === 'PAUSED' ? s.voting_open : false,
      }));
    }
    const next = await commit(doc, { statuses: [doc.status as ChallengeStatus] }, { $set: set }, {
      actorId: user.id,
      action,
      oldValue: { status: doc.status },
      newValue: { status: to },
    });
    // The live link goes to confirmed attendees once the challenge has
    // actually started (the write above), on the channels the host left on.
    if (action === 'START') await podChallengeNotify.auto(next, pod.pod_title, 'LIVE', user.id);
    return viewOf(next, pod, user);
  },

};
