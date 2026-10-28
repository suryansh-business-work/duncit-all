import { validate } from '@utils/validate';
import { escapedSearchRegex } from '@utils/table-query';
import { MANUAL_TEST_LIMITS as L } from './manualTest.constants';
import { ManualTestCaseModel, ManualTestColumnModel } from './manualTest.model';
import {
  CARD_PROJECTION,
  badInput,
  cardPub,
  columnPub,
  conflict,
  notFound,
  peopleOf,
  requireId,
  type CardRecord,
} from './manualTest.pub';
import { rankBetween } from './manualTest.rank';
import { isExecution } from './manualTestCase.rules';
import { caseCounts } from './manualTestColumn.service';
import { boardFilterSchema, type BoardFilterInput } from './manualTest.validator';

const RANK_ORDER = { rank: 1, _id: 1 } as const;
const STALE = 'The board changed while you were moving this card. It has been reloaded.';

/** The board filter as a case query. */
function boardMatch(filter: BoardFilterInput): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (filter.search) {
    const pattern = escapedSearchRegex(filter.search);
    match.$or = [{ key: pattern }, { title: pattern }];
  }
  if (filter.assignee_id) match.assignee_id = filter.assignee_id;
  if (filter.type) match.type = filter.type;
  if (filter.priority) match.priority = filter.priority;
  if (filter.label) match.labels = filter.label;
  if (filter.surface) match.surface = filter.surface;
  if (filter.environment) match.environment = filter.environment;
  return match;
}

/** One page of one column's cards, in rank order, with how many match in all. */
async function columnPage(columnId: string, match: Record<string, unknown>, offset: number) {
  const filter = { ...match, column_id: columnId };
  const [docs, total] = await Promise.all([
    ManualTestCaseModel.find(filter)
      .sort(RANK_ORDER)
      .skip(offset)
      .limit(L.boardPageSize)
      .select(CARD_PROJECTION)
      .lean<CardRecord[]>(),
    ManualTestCaseModel.countDocuments(filter),
  ]);
  return { docs, total };
}

/** A neighbour the client named must still sit in the target column. */
async function anchorRank(id: string, columnId: string): Promise<string> {
  const doc = await ManualTestCaseModel.findOne({ _id: id, column_id: columnId }).select('rank').lean();
  if (!doc) throw conflict(STALE);
  return doc.rank;
}

/**
 * The rank that puts a card right after `afterId` (or right before `beforeId`,
 * or at the bottom). The other neighbour is read from the database, not taken
 * from the client, so a board that is slightly out of date still yields a rank
 * strictly between two real cards.
 */
async function rankFor(id: string, columnId: string, afterId?: string | null, beforeId?: string | null) {
  const others = { column_id: columnId, _id: { $ne: id } };
  if (afterId) {
    const lower = await anchorRank(afterId, columnId);
    const next = await ManualTestCaseModel.findOne({ ...others, rank: { $gt: lower } }).sort(RANK_ORDER).select('rank').lean();
    return rankBetween(lower, next?.rank ?? null);
  }
  if (beforeId) {
    const upper = await anchorRank(beforeId, columnId);
    const previous = await ManualTestCaseModel.findOne({ ...others, rank: { $lt: upper } })
      .sort({ rank: -1, _id: -1 })
      .select('rank')
      .lean();
    return rankBetween(previous?.rank ?? null, upper);
  }
  const last = await ManualTestCaseModel.findOne(others).sort({ rank: -1, _id: -1 }).select('rank').lean();
  return rankBetween(last?.rank ?? null, null);
}

export interface MoveCaseArgs {
  id: string;
  column_id: string;
  /** Place the case directly before this one. */
  before_id?: string | null;
  /** Place the case directly after this one (wins when both are given). */
  after_id?: string | null;
  /** The `updated_at` the client last saw; a later change is refused as CONFLICT. */
  expected_updated_at?: string | null;
}

function assertMoveIds(args: MoveCaseArgs): void {
  requireId(args.id, 'Case');
  requireId(args.column_id, 'Column');
  if (args.after_id) requireId(args.after_id, 'Case');
  if (args.before_id) requireId(args.before_id, 'Case');
  if (args.after_id === args.id || args.before_id === args.id) throw badInput('A case cannot be placed next to itself');
}

export const manualTestBoardService = {
  /**
   * The board: every column left to right with its first page of cards in rank
   * order and how many cards match the filter in all. Two indexed reads per
   * column, one grouped count of every column (its unfiltered size, which the
   * WIP limit is judged on), and one user lookup for every assignee shown.
   */
  async board(input: unknown) {
    const filter = await validate<BoardFilterInput>(boardFilterSchema, input ?? {});
    const match = boardMatch(filter);
    const [columns, counts] = await Promise.all([
      ManualTestColumnModel.find().sort({ order: 1, _id: 1 }).lean(),
      caseCounts(),
    ]);
    const pages = await Promise.all(columns.map((column) => columnPage(String(column._id), match, 0)));
    const people = await peopleOf(pages.flatMap((page) => page.docs.map((doc) => doc.assignee_id)));
    return {
      columns: columns.map((column, index) => ({
        column: columnPub(column, counts.get(String(column._id)) ?? 0),
        cases: pages[index].docs.map((doc) => cardPub(doc, people)),
        total: pages[index].total,
      })),
    };
  },

  /** The next page of one column ("load more"), under the same filter. */
  async columnCases(columnId: string, input: unknown, offset: number) {
    requireId(columnId, 'Column');
    const filter = await validate<BoardFilterInput>(boardFilterSchema, input ?? {});
    const start = Math.max(0, Math.trunc(offset || 0));
    const page = await columnPage(columnId, boardMatch(filter), start);
    const people = await peopleOf(page.docs.map((doc) => doc.assignee_id));
    return { cases: page.docs.map((doc) => cardPub(doc, people)), total: page.total };
  },

  /**
   * Move a card to a column and a place in it. Writes ONE document — its column
   * and a rank between its new neighbours — guarded by the `updated_at` the
   * client saw, so two people dragging the same card cannot both win.
   */
  async move(args: MoveCaseArgs) {
    assertMoveIds(args);
    const [current, target] = await Promise.all([
      ManualTestCaseModel.findById(args.id).select('column_id updated_at').lean(),
      ManualTestColumnModel.findById(args.column_id).select('category').lean(),
    ]);
    if (!current) throw notFound('Case');
    if (!target) throw notFound('Column');
    if (args.expected_updated_at && current.updated_at.toISOString() !== args.expected_updated_at) throw conflict(STALE);

    const set: Record<string, unknown> = {
      column_id: args.column_id,
      rank: await rankFor(args.id, args.column_id, args.after_id, args.before_id),
    };
    if (String(current.column_id) !== args.column_id) {
      const source = await ManualTestColumnModel.findById(current.column_id).select('category').lean();
      if (isExecution(target.category, source?.category ?? null)) set.executed_at = new Date();
    }
    const doc = await ManualTestCaseModel.findOneAndUpdate(
      { _id: args.id, updated_at: current.updated_at },
      { $set: set },
      { new: true }
    )
      .select(CARD_PROJECTION)
      .lean<CardRecord>();
    if (!doc) throw conflict(STALE);
    return cardPub(doc, await peopleOf([doc.assignee_id]));
  },
};
