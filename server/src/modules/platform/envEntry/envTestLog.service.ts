import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import {
  healthOf,
  isServing,
  loadEnvRows,
  type TestHealth,
} from '@modules/platform/analytics/entity/envKeys.data';
import { EnvEntryModel, ENV_CATEGORIES } from './envEntry.model';
import { EnvTestLogModel } from './envTestLog.model';

/**
 * Every test outcome goes through `recordTest`: it stamps the entry (the table's
 * green check) AND appends a history line, so the two can never disagree.
 */

const MESSAGE_MAX = 500;
const HISTORY_MAX = 100;

export interface RecordTestInput {
  id: string;
  ok: boolean;
  message?: string | null;
  kind: string;
  actor?: string | null;
}

const toObjectId = (id: string | null | undefined) =>
  id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;

export async function recordTest(input: Readonly<RecordTestInput>): Promise<void> {
  const now = new Date();
  const entry = await EnvEntryModel.findByIdAndUpdate(
    input.id,
    { $set: { last_tested_at: now, last_test_ok: input.ok, ...(input.ok ? { last_used_at: now } : {}) } },
    { new: false }
  )
    .select('name category')
    .lean();
  if (!entry) return;
  await EnvTestLogModel.create({
    entry_id: entry._id,
    category: entry.category,
    entry_name: entry.name,
    kind: input.kind,
    ok: input.ok,
    message: String(input.message ?? '').slice(0, MESSAGE_MAX),
    tested_by: toObjectId(input.actor),
  });
}

/** Display names for the testers on a page of history, in ONE query. */
async function testerNames(ids: readonly (Types.ObjectId | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (unique.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: unique } })
    .select('profile.first_name profile.last_name')
    .lean<{ _id: Types.ObjectId; profile?: { first_name?: string; last_name?: string } }[]>();
  return new Map(
    users.map((u) => [String(u._id), [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' ')])
  );
}

interface Counts {
  total: number;
  active: number;
  tested: number;
  passing: number;
  failing: number;
  untested: number;
}

const blankCounts = (): Counts => ({ total: 0, active: 0, tested: 0, passing: 0, failing: 0, untested: 0 });

function count(target: Counts, active: boolean, health: TestHealth): void {
  target.total += 1;
  if (active) target.active += 1;
  if (health === 'PASSING') target.passing += 1;
  else if (health === 'FAILING') target.failing += 1;
  else target.untested += 1;
  target.tested = target.passing + target.failing;
}

export const envTestLogService = {
  /**
   * Newest first — one entry's, or every entry's when no id is given. `category`
   * may be a list: a caller confined to some categories reads any of them.
   */
  async history(
    entryId: string | null | undefined,
    limit: number | null | undefined,
    category?: string | readonly string[] | null
  ) {
    const size = Math.min(Math.max(Number(limit) || 20, 1), HISTORY_MAX);
    const filter: Record<string, unknown> = {};
    if (entryId) filter.entry_id = toObjectId(entryId) ?? new Types.ObjectId();
    if (typeof category === 'string') {
      if (category) filter.category = category;
    } else if (category) {
      filter.category = { $in: category };
    }
    const rows = await EnvTestLogModel.find(filter).sort({ created_at: -1 }).limit(size).lean();
    const names = await testerNames(rows.map((r) => r.tested_by));
    return rows.map((r) => ({
      id: String(r._id),
      entry_id: String(r.entry_id),
      entry_name: r.entry_name,
      category: r.category,
      kind: r.kind,
      ok: r.ok,
      message: r.message,
      tested_by: r.tested_by ? names.get(String(r.tested_by)) || null : null,
      created_at: r.created_at.toISOString(),
    }));
  },

  /** The mini dashboard and the sidebar's per-category counts. Never reads `config`. */
  async overview() {
    const rows = await loadEnvRows();
    const perCategory = new Map(ENV_CATEGORIES.map((c) => [c as string, blankCounts()]));
    const totals = blankCounts();
    for (const row of rows) {
      const bucket = perCategory.get(row.category);
      const health = healthOf(row);
      count(totals, row.is_active, health);
      if (bucket) count(bucket, row.is_active, health);
    }
    return {
      ...totals,
      services: ENV_CATEGORIES.length,
      services_ready: new Set(rows.filter(isServing).map((r) => r.category)).size,
      categories: [...perCategory.entries()].map(([category, counts]) => ({ category, ...counts })),
    };
  },
};
