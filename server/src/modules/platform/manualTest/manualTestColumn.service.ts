import { Types, type ClientSession } from 'mongoose';
import { logs } from '@observability/log';
import { validate } from '@utils/validate';
import { withTransaction } from '@utils/mongoTransaction';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { MANUAL_TEST_LIMITS as L } from './manualTest.constants';
import { ManualTestCaseModel, ManualTestColumnModel } from './manualTest.model';
import { badInput, columnPub, conflict, notFound, requireId, type ColumnPub } from './manualTest.pub';
import { ranksAfter } from './manualTest.rank';
import { columnSchema, reorderSchema, type ColumnInput, type ReorderInput } from './manualTest.validator';

const COLUMN_SORT = { order: 1, _id: 1 } as const;

/** A duplicate name is the person's mistake, not a server error. */
function nameTaken(error: unknown): never {
  if (isDuplicateKeyError(error)) throw badInput('A column with this name already exists');
  throw error;
}

/** Cases per column, in one aggregation over the column index. */
export async function caseCounts(): Promise<Map<string, number>> {
  const rows = await ManualTestCaseModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $group: { _id: '$column_id', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
}

/** Move every case of one column to the bottom of another, keeping their order. */
async function relocateCases(fromId: string, toId: string, session: ClientSession | undefined): Promise<number> {
  const moving = await ManualTestCaseModel.find({ column_id: fromId })
    .sort({ rank: 1, _id: 1 })
    .select('_id')
    .session(session ?? null)
    .lean();
  if (moving.length === 0) return 0;
  const last = await ManualTestCaseModel.findOne({ column_id: toId })
    .sort({ rank: -1, _id: -1 })
    .select('rank')
    .session(session ?? null)
    .lean();
  const ranks = ranksAfter(last?.rank ?? null, moving.length);
  // A filter casts a string id for us; a bulk $set is typed against the schema, so it gets the real ObjectId.
  const target = new Types.ObjectId(toId);
  await ManualTestCaseModel.bulkWrite(
    moving.map((doc, index) => ({
      updateOne: { filter: { _id: doc._id }, update: { $set: { column_id: target, rank: ranks[index] } } },
    })),
    { session }
  );
  return moving.length;
}

export const manualTestColumnService = {
  /** Every column left to right, each with how many cases it holds. */
  async list(): Promise<ColumnPub[]> {
    const [columns, counts] = await Promise.all([
      ManualTestColumnModel.find().sort(COLUMN_SORT).lean(),
      caseCounts(),
    ]);
    return columns.map((column) => columnPub(column, counts.get(String(column._id)) ?? 0));
  },

  /** Every column by id, for naming a case's status without a lookup per case. */
  async byId(): Promise<Map<string, ColumnPub>> {
    const columns = await ManualTestColumnModel.find().sort(COLUMN_SORT).lean();
    return new Map(columns.map((column) => [String(column._id), columnPub(column)]));
  },

  async create(input: unknown): Promise<ColumnPub> {
    const data = await validate<ColumnInput>(columnSchema, input);
    if ((await ManualTestColumnModel.estimatedDocumentCount()) >= L.columnsMax) {
      throw badInput(`A board has at most ${L.columnsMax} columns`);
    }
    const last = await ManualTestColumnModel.findOne().sort({ order: -1 }).select('order').lean();
    const doc = await ManualTestColumnModel.create({ ...data, order: (last?.order ?? -1) + 1 }).catch(nameTaken);
    logs.server.info('manualTest', 'createColumn', { column: doc.name, category: doc.category });
    return columnPub(doc, 0);
  },

  async update(id: string, input: unknown): Promise<ColumnPub> {
    requireId(id, 'Column');
    const data = await validate<ColumnInput>(columnSchema, input);
    const doc = await ManualTestColumnModel.findByIdAndUpdate(id, data, { new: true }).lean().catch(nameTaken);
    if (!doc) throw notFound('Column');
    return columnPub(doc);
  },

  /** The whole board's order at once: `ids` must name every column exactly once. */
  async reorder(input: unknown): Promise<ColumnPub[]> {
    const { ids } = await validate<ReorderInput>(reorderSchema, input);
    const existing = await ManualTestColumnModel.find().select('_id').lean();
    const known = new Set(existing.map((column) => String(column._id)));
    const complete = ids.length === known.size && new Set(ids).size === ids.length && ids.every((id) => known.has(id));
    if (!complete) throw conflict('The columns changed while you were reordering them. Reload and try again.');
    await ManualTestColumnModel.bulkWrite(
      ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { $set: { order } } } }))
    );
    return manualTestColumnService.list();
  },

  /**
   * Delete a column; its cases go to the bottom of `targetId`, in their order.
   * One transaction, so a failure leaves both columns exactly as they were.
   */
  async remove(id: string, targetId: string): Promise<boolean> {
    requireId(id, 'Column');
    requireId(targetId, 'Target column');
    if (id === targetId) throw badInput('Choose a different column to receive the cases');
    const [column, target] = await Promise.all([
      ManualTestColumnModel.findById(id).select('name').lean(),
      ManualTestColumnModel.findById(targetId).select('name').lean(),
    ]);
    if (!column) throw notFound('Column');
    if (!target) throw notFound('Target column');

    const moved = await withTransaction(async (session) => {
      const count = await relocateCases(id, targetId, session);
      await ManualTestColumnModel.deleteOne({ _id: id }, { session });
      return count;
    });
    // A card dragged into the column in the instant it was deleted would have
    // no column at all; this second pass leaves no case behind.
    await relocateCases(id, targetId, undefined);
    logs.server.info('manualTest', 'deleteColumn', { column: column.name, target: target.name, moved });
    return true;
  },
};
