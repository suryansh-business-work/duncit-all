import { UserModel } from '@modules/access/user/user.model';
import { E2eFlowModel } from '@modules/platform/e2eFlow/e2eFlow.model';
import { EntityIdCounterModel } from '@modules/venues/entityIdCounter';
import {
  EXECUTED_CATEGORIES,
  MANUAL_CASE_COUNTER_KEY,
  MANUAL_CASE_KEY_PREFIX,
  MANUAL_TEST_ROLES,
  PRIORITY_WEIGHT,
  type ManualTestCategory,
} from './manualTest.constants';
import { ManualTestCaseModel } from './manualTest.model';
import { badInput, normalizedRichText } from './manualTest.pub';
import { rankBetween } from './manualTest.rank';
import type { CaseUpdateInput } from './manualTest.validator';

/*
 * What every write to a case has to agree with, shared by create, update and
 * move: the next key, the bottom of a column, who may be named on a case, and
 * which E2E journey it may point at.
 */

/**
 * The next case number, from the shared atomic entity counter: one
 * `findOneAndUpdate` with `$inc`, so two cases created at the same instant can
 * never share a key (and the unique key index backs that up).
 */
export async function nextCaseKey(): Promise<{ number: number; key: string }> {
  const counter = await EntityIdCounterModel.findOneAndUpdate(
    { singleton_key: MANUAL_CASE_COUNTER_KEY },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return { number: counter.seq, key: `${MANUAL_CASE_KEY_PREFIX}-${counter.seq}` };
}

/** A rank below every card already in the column. */
export async function bottomRank(columnId: string): Promise<string> {
  const last = await ManualTestCaseModel.findOne({ column_id: columnId })
    .sort({ rank: -1, _id: -1 })
    .select('rank')
    .lean();
  return rankBetween(last?.rank ?? null, null);
}

/** Whether landing in `to` from `from` counts as an execution for the dashboard. */
export const isExecution = (to: ManualTestCategory, from: ManualTestCategory | null): boolean =>
  EXECUTED_CATEGORIES.has(to) && (from === null || !EXECUTED_CATEGORIES.has(from));

/** Assignee and reporter are Tests staff — the people the board itself admits. */
export async function assertStaff(ids: ReadonlyArray<string | null | undefined>): Promise<void> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return;
  const found = await UserModel.countDocuments({
    _id: { $in: wanted },
    'metadata.role_keys': { $in: MANUAL_TEST_ROLES },
  });
  if (found !== wanted.length) throw badInput('Only Tests staff can be assigned to or report a case');
}

/** A linked flow must exist, and a linked sub flow must be one of its own. */
export async function assertFlowLink(flowId: string | null | undefined, subFlowId: string | null | undefined): Promise<void> {
  if (!flowId) {
    if (subFlowId) throw badInput('A sub flow can only be linked together with its flow');
    return;
  }
  const flow = await E2eFlowModel.findById(flowId).select('sub_flows._id').lean();
  if (!flow) throw badInput('The linked E2E flow no longer exists');
  if (subFlowId && !(flow.sub_flows ?? []).some((sub) => String(sub._id) === subFlowId)) {
    throw badInput('The linked sub flow is not part of that E2E flow');
  }
}

/** Labels as typed, trimmed, each once (case-insensitively), in the order given. */
function uniqueLabels(labels: readonly string[]): string[] {
  const seen = new Set<string>();
  return labels.filter((label) => {
    const key = label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const RICH_TEXT_FIELDS = ['description', 'preconditions', 'expected_result', 'actual_result'] as const;
const NULLABLE_FIELDS = [
  'assignee_id',
  'reporter_id',
  'e2e_flow_id',
  'e2e_sub_flow_id',
  'due_date',
  'estimate_minutes',
] as const;

/** The fields that are copied as given, or cleared to null / empty. */
function plainSet(data: CaseUpdateInput): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  for (const field of NULLABLE_FIELDS) {
    if (data[field] !== undefined) set[field] = data[field];
  }
  for (const field of RICH_TEXT_FIELDS) {
    if (data[field] !== undefined) set[field] = normalizedRichText(data[field]);
  }
  // A new flow (or none) drops the old flow's sub flow unless one is named with it.
  if (data.e2e_flow_id !== undefined && data.e2e_sub_flow_id === undefined) set.e2e_sub_flow_id = null;
  return set;
}

/** The `$set` of a create or an update — only what the input names. */
export function caseSet(data: CaseUpdateInput): Record<string, unknown> {
  const set = plainSet(data);
  if (data.title) set.title = data.title;
  if (data.type) set.type = data.type;
  if (data.environment) set.environment = data.environment;
  if (data.priority) {
    set.priority = data.priority;
    set.priority_weight = PRIORITY_WEIGHT[data.priority];
  }
  if (data.surface !== undefined) set.surface = data.surface ?? '';
  if (data.labels !== undefined) set.labels = uniqueLabels(data.labels ?? []);
  if (data.steps !== undefined) set.steps = data.steps ?? [];
  return set;
}
