import type { BoardColumnData, BoardData, ManualCard } from '../shared/types';
import type { MovePlan } from './dndItems';

/*
 * Pure edits of the cached board, so a move shows at once (and is put back
 * exactly as it was if the server refuses it).
 */

const counted = (column: BoardColumnData, delta: number): BoardColumnData => ({
  ...column,
  total: Math.max(0, column.total + delta),
  column: { ...column.column, case_count: Math.max(0, (column.column.case_count ?? 0) + delta) },
});

/** The board with one card moved to its new column and place. */
export function applyMove(data: BoardData, plan: MovePlan): BoardData {
  const source = data.manualTestBoard.columns.find((column) => column.column.id === plan.fromColumnId);
  const moving = source?.cases.find((card) => card.id === plan.cardId);
  if (!moving) return data;
  const card: ManualCard = { ...moving, column_id: plan.toColumnId };
  const columns = data.manualTestBoard.columns.map((column) => {
    let next = column;
    if (column.column.id === plan.fromColumnId) {
      next = counted({ ...next, cases: next.cases.filter((item) => item.id !== plan.cardId) }, -1);
    }
    if (column.column.id === plan.toColumnId) {
      const cases = [...next.cases];
      cases.splice(plan.toIndex, 0, card);
      next = counted({ ...next, cases }, 1);
    }
    return next;
  });
  return { manualTestBoard: { ...data.manualTestBoard, columns } };
}

/** The board with the next page of one column appended ("load more"). */
export function appendCases(
  data: BoardData,
  columnId: string,
  page: { total: number; cases: ManualCard[] }
): BoardData {
  const columns = data.manualTestBoard.columns.map((column) => {
    if (column.column.id !== columnId) return column;
    const known = new Set(column.cases.map((card) => card.id));
    return {
      ...column,
      total: page.total,
      cases: [...column.cases, ...page.cases.filter((card) => !known.has(card.id))],
    };
  });
  return { manualTestBoard: { ...data.manualTestBoard, columns } };
}
