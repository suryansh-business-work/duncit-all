import type { PipelineStage } from 'mongoose';
import { OpenAiUsageLogModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import { getAppTimeZone } from '@utils/app-time';
import { AskDuncitAuditModel } from '../audit/askDuncitAudit.model';
import { AskDuncitConversationModel } from '../conversation/askDuncitConversation.model';
import { AskDuncitMessageModel } from '../conversation/askDuncitMessage.model';

/**
 * The Ask Duncit dashboard and cost analytics. Activity comes from the audit
 * trail (one row per question, answer, tool call, violation…); MONEY comes
 * from OpenAI Logs (module "Ask Duncit"), which also carries the evaluator,
 * memory and voice calls — the one place every token spent is priced.
 */

const ASK_MODULE = 'Ask Duncit';
const round = (n: number, digits = 6) => Math.round(n * 10 ** digits) / 10 ** digits;

export const sinceDays = (days: number, now = Date.now()) => new Date(now - Math.min(Math.max(days, 1), 365) * 86_400_000);

/** Safe ratio, 0 when the denominator is 0. */
export const ratio = (part: number, whole: number) => (whole > 0 ? round(part / whole, 4) : 0);

async function countByType(since: Date) {
  const rows = await AskDuncitAuditModel.aggregate<{ _id: string; n: number; latency: number }>([
    { $match: { created_at: { $gte: since } } },
    { $group: { _id: '$type', n: { $sum: 1 }, latency: { $avg: '$latency_ms' } } },
  ]);
  return new Map(rows.map((r) => [r._id, r]));
}

async function spend(since: Date) {
  const [row] = await OpenAiUsageLogModel.aggregate<{ cost: number; tokens: number }>([
    { $match: { module: ASK_MODULE, created_at: { $gte: since } } },
    { $group: { _id: null, cost: { $sum: '$cost_usd' }, tokens: { $sum: '$total_tokens' } } },
  ]);
  return { cost_usd: round(row?.cost ?? 0), total_tokens: row?.tokens ?? 0 };
}

async function evaluation(since: Date) {
  const [row] = await AskDuncitMessageModel.aggregate<{ evaluated: number; resolved: number; up: number; down: number; first: number; confidence: number }>([
    { $match: { role: 'assistant', created_at: { $gte: since } } },
    {
      $group: {
        _id: null,
        evaluated: { $sum: { $cond: [{ $ne: ['$resolved', null] }, 1, 0] } },
        resolved: { $sum: { $cond: ['$resolved', 1, 0] } },
        up: { $sum: { $cond: [{ $eq: ['$feedback.rating', 'UP'] }, 1, 0] } },
        down: { $sum: { $cond: [{ $eq: ['$feedback.rating', 'DOWN'] }, 1, 0] } },
        first: { $avg: { $cond: [{ $gt: ['$first_token_ms', 0] }, '$first_token_ms', null] } },
        confidence: { $avg: '$confidence' },
      },
    },
  ]);
  return row ?? { evaluated: 0, resolved: 0, up: 0, down: 0, first: 0, confidence: 0 };
}

function dailyPipeline(since: Date): PipelineStage[] {
  return [
    { $match: { created_at: { $gte: since }, type: { $in: ['QUERY', 'VIOLATION', 'ACTION_FAILED'] } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: getAppTimeZone() } },
        messages: { $sum: { $cond: [{ $eq: ['$type', 'QUERY'] }, 1, 0] } },
        violations: { $sum: { $cond: [{ $eq: ['$type', 'VIOLATION'] }, 1, 0] } },
        failed_actions: { $sum: { $cond: [{ $eq: ['$type', 'ACTION_FAILED'] }, 1, 0] } },
        users: { $addToSet: '$user_id' },
      },
    },
    { $project: { _id: 0, date: '$_id', messages: 1, violations: 1, failed_actions: 1, users: { $size: '$users' } } },
    { $sort: { date: 1 } },
  ];
}

const groupedCount = (since: Date, type: string, key: string, limit = 12) =>
  AskDuncitAuditModel.aggregate<{ key: string; count: number; users: number; failures: number }>([
    { $match: { created_at: { $gte: since }, type } },
    { $group: { _id: `$${key}`, count: { $sum: 1 }, users: { $addToSet: '$user_id' }, failures: { $sum: { $cond: [{ $ne: ['$status', 'OK'] }, 1, 0] } } } },
    { $project: { _id: 0, key: { $ifNull: ['$_id', ''] }, count: 1, users: { $size: '$users' }, failures: 1 } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

export const askDuncitAnalytics = {
  async dashboard(days: number) {
    const since = sinceDays(days);
    const [types, money, evals, conversations, activeUsers, daily, roles, tools, violations] = await Promise.all([
      countByType(since),
      spend(since),
      evaluation(since),
      AskDuncitConversationModel.countDocuments({ created_at: { $gte: since } }),
      AskDuncitAuditModel.distinct('user_id', { type: 'QUERY', created_at: { $gte: since } }),
      AskDuncitAuditModel.aggregate(dailyPipeline(since)),
      groupedCount(since, 'QUERY', 'role_key'),
      groupedCount(since, 'TOOL_CALL', 'tool', 10),
      groupedCount(since, 'VIOLATION', 'violation_kind'),
    ]);
    const n = (type: string) => types.get(type)?.n ?? 0;
    return {
      days,
      conversations,
      active_users: activeUsers.filter(Boolean).length,
      messages: n('QUERY'),
      resolution_rate: ratio(evals.resolved, evals.evaluated),
      avg_response_ms: Math.round(types.get('RESPONSE')?.latency ?? 0),
      avg_first_token_ms: Math.round(evals.first ?? 0),
      avg_confidence: round(evals.confidence ?? 0, 3),
      total_tokens: money.total_tokens,
      cost_usd: money.cost_usd,
      tool_calls: n('TOOL_CALL'),
      failed_actions: n('ACTION_FAILED'),
      errors: n('ERROR'),
      handovers: n('HANDOVER'),
      out_of_context: n('OUT_OF_CONTEXT'),
      violations: n('VIOLATION'),
      thumbs_up: evals.up,
      thumbs_down: evals.down,
      satisfaction: ratio(evals.up, evals.up + evals.down),
      daily,
      role_usage: roles.map((r) => ({ role_key: r.key || 'UNKNOWN', messages: r.count, users: r.users })),
      top_tools: tools.map((t) => ({ tool: t.key, calls: t.count, failures: t.failures })),
      violation_kinds: violations.map((v) => ({ kind: v.key || 'UNKNOWN', count: v.count })),
    };
  },

  async cost(days: number) {
    const since = sinceDays(days);
    const match = { module: ASK_MODULE, created_at: { $gte: since } };
    const group = (field: string) =>
      OpenAiUsageLogModel.aggregate<{ key: string; calls: number; tokens: number; cost: number }>([
        { $match: match },
        { $group: { _id: `$${field}`, calls: { $sum: 1 }, tokens: { $sum: '$total_tokens' }, cost: { $sum: '$cost_usd' } } },
        { $project: { _id: 0, key: { $ifNull: ['$_id', ''] }, calls: 1, tokens: 1, cost: 1 } },
        { $sort: { cost: -1 } },
        { $limit: 20 },
      ]);
    const [byTask, byModel, byDay, unpriced, total] = await Promise.all([
      group('task_label'),
      group('model'),
      OpenAiUsageLogModel.aggregate<{ date: string; calls: number; tokens: number; cost: number }>([
        { $match: match },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: getAppTimeZone() } }, calls: { $sum: 1 }, tokens: { $sum: '$total_tokens' }, cost: { $sum: '$cost_usd' } } },
        { $project: { _id: 0, date: '$_id', calls: 1, tokens: 1, cost: 1 } },
        { $sort: { date: 1 } },
      ]),
      OpenAiUsageLogModel.distinct('model', { ...match, priced: false, total_tokens: { $gt: 0 } }),
      spend(since),
    ]);
    const roleSpend = await AskDuncitAuditModel.aggregate<{ key: string; tokens: number; cost: number }>([
      { $match: { created_at: { $gte: since }, type: 'RESPONSE' } },
      { $group: { _id: '$role_key', tokens: { $sum: '$total_tokens' }, cost: { $sum: '$cost_usd' } } },
      { $project: { _id: 0, key: '$_id', tokens: 1, cost: 1 } },
      { $sort: { cost: -1 } },
    ]);
    const fix = <T extends { cost: number }>(rows: T[]) => rows.map((r) => ({ ...r, cost: round(r.cost) }));
    return { days, total_cost_usd: total.cost_usd, total_tokens: total.total_tokens, by_task: fix(byTask), by_model: fix(byModel), by_day: fix(byDay), by_role: fix(roleSpend), unpriced_models: unpriced };
  },
};
