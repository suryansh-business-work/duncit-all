import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  emptyHistory,
  record,
  redoSteps,
  stepBack,
  stepForward,
  undoSteps,
  type Action,
} from '../../../src/pages/team-structure/history';
import type { NodeDraft } from '../../../src/pages/team-structure/types';

const draft = (id: string, over: Partial<NodeDraft> = {}): NodeDraft => ({
  id,
  parent_id: null,
  kind: 'ROLE',
  title: `Seat ${id}`,
  employment_type: 'FULL_TIME',
  status: 'FILLED',
  sort_order: 0,
  pay: [],
  ...over,
});

const created: Action = { type: 'save', before: null, after: draft('a') };
const edited: Action = { type: 'save', before: draft('a', { title: 'Old' }), after: draft('a', { title: 'New' }) };
const removed: Action = { type: 'remove', seat: draft('m', { parent_id: 'r' }), children: [draft('c1', { parent_id: 'm' }), draft('c2', { parent_id: 'm' })] };

describe('undoSteps', () => {
  it('deletes a seat that the action created', () => {
    expect(undoSteps(created)).toEqual([{ type: 'delete', id: 'a' }]);
  });

  it('puts an edited seat back as it was', () => {
    expect(undoSteps(edited)).toEqual([{ type: 'upsert', draft: edited.type === 'save' ? edited.before : null }]);
  });

  it('restores a deleted seat first, then re-attaches its children to it', () => {
    const steps = undoSteps(removed);
    expect(steps.map((s) => (s.type === 'upsert' ? s.draft.id : s.id))).toEqual(['m', 'c1', 'c2']);
    expect(steps.every((s) => s.type === 'upsert')).toBe(true);
    expect(steps.slice(1).map((s) => (s.type === 'upsert' ? s.draft.parent_id : null))).toEqual(['m', 'm']);
  });
});

describe('redoSteps', () => {
  it('saves the seat again as the action left it, creation included', () => {
    expect(redoSteps(created)).toEqual([{ type: 'upsert', draft: draft('a') }]);
    expect(redoSteps(edited)).toEqual([{ type: 'upsert', draft: draft('a', { title: 'New' }) }]);
  });

  it('deletes the seat again', () => {
    expect(redoSteps(removed)).toEqual([{ type: 'delete', id: 'm' }]);
  });
});

describe('history stacks', () => {
  it('starts with nothing to undo or redo', () => {
    expect(emptyHistory()).toEqual({ past: [], future: [] });
    expect(stepBack(emptyHistory())).toBeNull();
    expect(stepForward(emptyHistory())).toBeNull();
  });

  it('records actions in order', () => {
    const h = record(record(emptyHistory(), created), edited);
    expect(h.past).toEqual([created, edited]);
    expect(h.future).toEqual([]);
  });

  it('undoes the latest action and makes it redoable, then redoes it', () => {
    const h = record(record(emptyHistory(), created), edited);
    const back = stepBack(h);
    expect(back?.action).toBe(edited);
    expect(back?.next).toEqual({ past: [created], future: [edited] });
    const forward = stepForward(back!.next);
    expect(forward?.action).toBe(edited);
    expect(forward?.next).toEqual({ past: [created, edited], future: [] });
  });

  it('walks several steps back and forth in last-in-first-out order', () => {
    let h = [created, edited, removed].reduce(record, emptyHistory());
    const undone: Action[] = [];
    for (let step = stepBack(h); step; step = stepBack(h)) {
      undone.push(step.action);
      h = step.next;
    }
    expect(undone).toEqual([removed, edited, created]);
    // Redo starts from the oldest undone action, so the stack is read from its end.
    expect(h.future).toEqual([removed, edited, created]);
    expect(stepForward(h)?.action).toBe(created);
  });

  it('throws away the redo branch when a new action is recorded after an undo', () => {
    const h = record(record(emptyHistory(), created), edited);
    const back = stepBack(h)!;
    const next = record(back.next, removed);
    expect(next).toEqual({ past: [created, removed], future: [] });
  });

  it('keeps only the most recent actions so a long session stays bounded', () => {
    let h = emptyHistory();
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) h = record(h, { type: 'save', before: null, after: draft(`n${i}`) });
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(h.past[0]).toEqual({ type: 'save', before: null, after: draft('n5') });
    expect(h.past.at(-1)).toEqual({ type: 'save', before: null, after: draft(`n${HISTORY_LIMIT + 4}`) });
  });
});
