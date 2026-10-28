import type { NodeDraft } from './types';

/** One server write: save a seat as this draft, or delete a seat. */
export type Step = { type: 'upsert'; draft: NodeDraft } | { type: 'delete'; id: string };

/**
 * One user action, recorded with enough to reverse it.
 *
 * `save` covers add, edit, move and re-order: `before` is null for a new seat.
 * `remove` keeps the seat's children, because the server moves them up to the
 * seat's parent on delete and undo has to put them back under it.
 */
export type Action =
  | { type: 'save'; before: NodeDraft | null; after: NodeDraft }
  | { type: 'remove'; seat: NodeDraft; children: NodeDraft[] };

export function undoSteps(action: Action): Step[] {
  if (action.type === 'save') {
    return action.before
      ? [{ type: 'upsert', draft: action.before }]
      : [{ type: 'delete', id: action.after.id as string }];
  }
  return [
    { type: 'upsert', draft: action.seat },
    ...action.children.map((child): Step => ({ type: 'upsert', draft: child })),
  ];
}

export function redoSteps(action: Action): Step[] {
  return action.type === 'save'
    ? [{ type: 'upsert', draft: action.after }]
    : [{ type: 'delete', id: action.seat.id as string }];
}

/** Keeps memory bounded on a long editing session. */
export const HISTORY_LIMIT = 100;

/** Two stacks: what can be undone, and what an undo has made redoable. */
export interface History {
  past: Action[];
  future: Action[];
}

export const emptyHistory = (): History => ({ past: [], future: [] });

/** A new action discards the redo branch, as every editor does. */
export const record = (history: History, action: Action): History => ({
  past: [...history.past, action].slice(-HISTORY_LIMIT),
  future: [],
});

/** The action to reverse, and the history once it has been. Null when there is nothing to undo. */
export function stepBack(history: History): { action: Action; next: History } | null {
  const action = history.past.at(-1);
  if (!action) return null;
  return { action, next: { past: history.past.slice(0, -1), future: [...history.future, action] } };
}

export function stepForward(history: History): { action: Action; next: History } | null {
  const action = history.future.at(-1);
  if (!action) return null;
  return { action, next: { past: [...history.past, action], future: history.future.slice(0, -1) } };
}
