import type { Types } from 'mongoose';
import {
  MANUAL_TEST_CASE_TYPES,
  MANUAL_TEST_CATEGORIES,
  MANUAL_TEST_PRIORITIES,
  type ManualTestCategory,
} from './manualTest.constants';
import { ManualTestCaseModel, ManualTestColumnModel } from './manualTest.model';
import { manualTestActivityService } from './manualTestActivity.service';
import { manualTestBoardService } from './manualTestBoard.service';
import { manualTestCaseService } from './manualTestCase.service';
import { manualTestColumnService } from './manualTestColumn.service';
import { manualTestCommentService } from './manualTestComment.service';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** One bucket of a breakdown; every bucket of the vocabulary is listed, empty ones as 0. */
export interface ManualTestCount {
  key: string;
  count: number;
}

/** The manual-testing numbers the Tests dashboard shows. */
export interface ManualTestBoardStats {
  total: number;
  by_category: ManualTestCount[];
  by_priority: ManualTestCount[];
  by_type: ManualTestCount[];
  /** Bugs whose column is not a PASSED one. */
  open_bugs: number;
  /** Cases that landed in a PASSED or FAILED column in the last seven days. */
  executed_last_7_days: number;
  /** PASSED / (PASSED + FAILED), 0..1; null while nothing has passed or failed. */
  pass_rate: number | null;
}

type Group = { _id: Types.ObjectId | string | null; count: number };

const groupBy = (field: string, match: Record<string, unknown> = {}) =>
  ManualTestCaseModel.aggregate<Group>([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);

const countsOf = (keys: readonly string[], groups: readonly Group[]): ManualTestCount[] => {
  const byKey = new Map(groups.map((group) => [String(group._id), group.count]));
  return keys.map((key) => ({ key, count: byKey.get(key) ?? 0 }));
};

/** Column-grouped counts folded into their columns' categories. */
function byCategory(groups: readonly Group[], categoryOf: Map<string, ManualTestCategory>): Group[] {
  const totals = new Map<string, number>();
  for (const group of groups) {
    const category = categoryOf.get(String(group._id));
    if (category) totals.set(category, (totals.get(category) ?? 0) + group.count);
  }
  return [...totals].map(([category, count]) => ({ _id: category, count }));
}

/**
 * Cheap by construction: four grouped aggregations over indexed fields, one
 * indexed count, and the (small) column list — no read of any case body.
 */
async function boardStats(now: Date = new Date()): Promise<ManualTestBoardStats> {
  const [columns, perColumn, perPriority, perType, bugsPerColumn, executed] = await Promise.all([
    ManualTestColumnModel.find().select('category').lean(),
    groupBy('column_id'),
    groupBy('priority'),
    groupBy('type'),
    groupBy('column_id', { type: 'BUG' }),
    ManualTestCaseModel.countDocuments({ executed_at: { $gte: new Date(now.getTime() - WEEK_MS) } }),
  ]);
  const categoryOf = new Map(columns.map((column) => [String(column._id), column.category]));
  const by_category = countsOf(MANUAL_TEST_CATEGORIES, byCategory(perColumn, categoryOf));
  const count = (category: ManualTestCategory) => by_category.find((row) => row.key === category)?.count ?? 0;
  const bugs = byCategory(bugsPerColumn, categoryOf);
  const passed = count('PASSED');
  const finished = passed + count('FAILED');
  return {
    total: perColumn.reduce((sum, group) => sum + group.count, 0),
    by_category,
    by_priority: countsOf(MANUAL_TEST_PRIORITIES, perPriority),
    by_type: countsOf(MANUAL_TEST_CASE_TYPES, perType),
    open_bugs: bugs.filter((group) => group._id !== 'PASSED').reduce((sum, group) => sum + group.count, 0),
    executed_last_7_days: executed,
    pass_rate: finished === 0 ? null : passed / finished,
  };
}

/** The Manual Testing module's whole service surface, for the resolver and the Tests dashboard. */
export const manualTestService = {
  boardStats,
  columns: manualTestColumnService,
  cases: manualTestCaseService,
  board: manualTestBoardService,
  comments: manualTestCommentService,
  activity: manualTestActivityService,
};
