import { escapeRegexLiteral } from '@utils/vet-regex';
import { OpenAiUsageLogModel } from '@modules/ai/openaiUsage/openaiUsage.model';
import { IntelDocumentModel } from '../index/intelDocument.model';

/**
 * Read-only reports for Settings: what is indexed (Knowledge & Indexes) and
 * what Intel's AI calls cost (API Usage & Cost, from the shared OpenAI usage log).
 */

export async function indexDocuments(args: { source?: string | null; scope?: string | null; status?: string | null; search?: string | null; page?: number | null; page_size?: number | null }) {
  const filter: Record<string, unknown> = {};
  if (args.source) filter.source = args.source;
  if (args.scope) filter.scope = args.scope;
  filter.status = args.status || { $ne: 'DELETED' };
  // Private files are listed in the owner's Media Manager, never here.
  filter.visibility = { $ne: 'PRIVATE' };
  if (args.search?.trim()) filter.title = new RegExp(escapeRegexLiteral(args.search.trim().slice(0, 100)), 'i');
  const pageSize = Math.min(Math.max(args.page_size ?? 25, 1), 100);
  const page = Math.max(args.page ?? 1, 1);
  const [rows, total] = await Promise.all([
    IntelDocumentModel.find(filter).sort({ indexed_at: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    IntelDocumentModel.countDocuments(filter),
  ]);
  return {
    total,
    rows: rows.map((d) => ({ id: String(d._id), source: d.source, connector_id: d.connector_id, scope: d.scope, title: d.title, url: d.url, version: d.version, chunk_count: d.chunk_count, status: d.status, error: d.error, indexed_at: d.indexed_at })),
  };
}

export async function indexStats() {
  const rows = await IntelDocumentModel.aggregate<{ _id: { source: string; scope: string }; documents: number; chunks: number; failed: number }>([
    { $match: { status: { $ne: 'DELETED' } } },
    { $group: { _id: { source: '$source', scope: '$scope' }, documents: { $sum: 1 }, chunks: { $sum: '$chunk_count' }, failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } } } },
    { $sort: { '_id.source': 1, '_id.scope': 1 } },
  ]);
  return rows.map((r) => ({ source: r._id.source, scope: r._id.scope, documents: r.documents, chunks: r.chunks, failed: r.failed }));
}

const INTEL_TASKS = /^intel\./;

export async function usage(daysArg: number | null | undefined) {
  const days = Math.min(Math.max(daysArg ?? 30, 1), 90);
  const since = new Date(Date.now() - days * 86_400_000);
  const match = { task: INTEL_TASKS, created_at: { $gte: since } };
  const group = (key: unknown) => [{ $match: match }, { $group: { _id: key, calls: { $sum: 1 }, tokens: { $sum: '$total_tokens' }, cost_usd: { $sum: '$cost_usd' } } }, { $sort: { _id: 1 as const } }];
  type Row = { _id: string; calls: number; tokens: number; cost_usd: number };
  const [byTask, byModel, byDay] = await Promise.all([
    OpenAiUsageLogModel.aggregate<Row>(group('$task')),
    OpenAiUsageLogModel.aggregate<Row>(group('$model')),
    OpenAiUsageLogModel.aggregate<Row>(group({ $dateToString: { format: '%Y-%m-%d', date: '$created_at' } })),
  ]);
  const toRows = (rows: Row[]) => rows.map((r) => ({ key: String(r._id), calls: r.calls, tokens: r.tokens, cost_usd: Math.round(r.cost_usd * 10_000) / 10_000 }));
  const total = byTask.reduce((acc, r) => ({ calls: acc.calls + r.calls, tokens: acc.tokens + r.tokens, cost: acc.cost + r.cost_usd }), { calls: 0, tokens: 0, cost: 0 });
  return { days, total_calls: total.calls, total_tokens: total.tokens, total_cost_usd: Math.round(total.cost * 10_000) / 10_000, by_task: toRows(byTask), by_model: toRows(byModel), by_day: toRows(byDay) };
}
