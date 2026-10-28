import { logs } from '@observability/log';
import { isDuplicateKeyError } from '@utils/mongo-error';
import type { ManualTestCategory } from './manualTest.constants';
import { ManualTestCaseModel, ManualTestColumnModel } from './manualTest.model';

/**
 * The board a fresh database starts with. Seed data only: once any column
 * exists the admins own the board (Tests > Manual Testing > Settings), and
 * nothing here is ever written again — a renamed or deleted column stays so.
 */
const DEFAULT_BOARD: ReadonlyArray<{ name: string; category: ManualTestCategory }> = [
  { name: 'Backlog', category: 'TODO' },
  { name: 'To Do', category: 'TODO' },
  { name: 'In Progress', category: 'IN_PROGRESS' },
  { name: 'In Review', category: 'IN_REVIEW' },
  { name: 'Passed', category: 'PASSED' },
  { name: 'Failed', category: 'FAILED' },
  { name: 'Blocked', category: 'BLOCKED' },
];

/**
 * Seed the default board when there is none. Idempotent, and safe on two
 * instances booting at once: the unique (case-insensitive) column name index is
 * built first, the columns are upserted by name, and an instance that loses the
 * race to another one's insert has nothing left to do.
 */
export async function seedManualTestBoard(): Promise<void> {
  // The unique indexes (column name, case number and key) must exist before the
  // first write relies on them.
  await Promise.all([ManualTestColumnModel.init(), ManualTestCaseModel.init()]);
  if (await ManualTestColumnModel.exists({})) return;
  try {
    await ManualTestColumnModel.bulkWrite(
      DEFAULT_BOARD.map((column, order) => ({
        updateOne: {
          filter: { name: column.name },
          update: { $setOnInsert: { ...column, order, wip_limit: null } },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    logs.server.info('manualTest', 'seed', { columns: DEFAULT_BOARD.length });
  } catch (error) {
    // Another instance seeded the same names a moment earlier.
    if (!isDuplicateKeyError(error)) throw error;
  }
}
