import { arrayMove } from '@dnd-kit/sortable';
import type { BoardColumnData, ManualCard } from '../shared/types';

/**
 * The board while a card is in the air: column id → the card ids it shows, in
 * order. Pure functions over it, so the drag logic is the same for a mouse, a
 * finger and the keyboard.
 */
export type Items = Record<string, string[]>;

/** Where a finished drag puts a card — what the move mutation and the cache need. */
export interface MovePlan {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  /** Position among the target column's loaded cards. */
  toIndex: number;
  /** The card now directly above it, or null at the top. */
  afterId: string | null;
  /** The card now directly below it, or null at the bottom. */
  beforeId: string | null;
}

// Columns are droppable too (an empty column has no card to drop on), under
// ids that can never be mistaken for a card's.
const COLUMN_PREFIX = 'column:';
export const columnDropId = (columnId: string) => `${COLUMN_PREFIX}${columnId}`;
const columnOfDropId = (id: string) => (id.startsWith(COLUMN_PREFIX) ? id.slice(COLUMN_PREFIX.length) : null);

export const itemsOf = (columns: readonly BoardColumnData[]): Items =>
  Object.fromEntries(columns.map((column) => [column.column.id, column.cases.map((card) => card.id)]));

export const cardsOf = (columns: readonly BoardColumnData[]): Map<string, ManualCard> =>
  new Map(columns.flatMap((column) => column.cases.map((card) => [card.id, card] as const)));

/** The column an id (a card, or a column's own drop zone) belongs to. */
export function containerOf(items: Items, id: string): string | null {
  const column = columnOfDropId(id);
  if (column !== null) return column in items ? column : null;
  return Object.keys(items).find((key) => items[key].includes(id)) ?? null;
}

/**
 * While dragging over ANOTHER column, the card joins it at the hovered place,
 * so that column opens a gap where it will land.
 */
export function moveAcross(items: Items, activeId: string, overId: string, below: boolean): Items {
  const from = containerOf(items, activeId);
  const to = containerOf(items, overId);
  if (!from || !to || from === to) return items;
  const target = items[to].filter((id) => id !== activeId);
  const overIndex = target.indexOf(overId);
  const index = overIndex === -1 ? target.length : overIndex + (below ? 1 : 0);
  target.splice(index, 0, activeId);
  return { ...items, [from]: items[from].filter((id) => id !== activeId), [to]: target };
}

/** On drop inside one column, the card takes the place of the one it was dropped on. */
export function settle(items: Items, activeId: string, overId: string): Items {
  const from = containerOf(items, activeId);
  if (!from || from !== containerOf(items, overId)) return items;
  const list = items[from];
  const oldIndex = list.indexOf(activeId);
  const newIndex = list.indexOf(overId);
  if (newIndex === -1 || oldIndex === newIndex) return items;
  return { ...items, [from]: arrayMove(list, oldIndex, newIndex) };
}

const neighbours = (list: readonly string[], id: string) => {
  const index = list.indexOf(id);
  return { index, after: index > 0 ? list[index - 1] : null, before: list[index + 1] ?? null };
};

/** The move a drop amounts to, or null when the card ends where it started. */
export function planOf(final: Items, base: Items, cardId: string): MovePlan | null {
  const from = containerOf(base, cardId);
  const to = containerOf(final, cardId);
  if (!from || !to) return null;
  const now = neighbours(final[to], cardId);
  const was = neighbours(base[from], cardId);
  if (from === to && now.after === was.after && now.before === was.before) return null;
  return {
    cardId,
    fromColumnId: from,
    toColumnId: to,
    toIndex: now.index,
    afterId: now.after,
    beforeId: now.before,
  };
}
