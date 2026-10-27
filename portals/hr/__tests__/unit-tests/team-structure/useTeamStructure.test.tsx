import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { notifyError } from '@duncit/dialogs';
import { DELETE_NODE, UPSERT_NODE } from '../../../src/pages/team-structure/queries';
import { useTeamStructure } from '../../../src/pages/team-structure/useTeamStructure';
import type { TeamNode } from '../../../src/pages/team-structure/types';

const apollo = vi.hoisted(() => ({
  query: { data: undefined as unknown, loading: false, error: undefined as unknown },
  refetch: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({ mutate: apollo.mutate }),
  useQuery: () => ({ ...apollo.query, refetch: apollo.refetch }),
}));
vi.mock('@duncit/dialogs', () => ({ notifyError: vi.fn() }));

const seat = (id: string, over: Partial<TeamNode> = {}): TeamNode => ({
  id,
  structure_id: 's1',
  parent_id: null,
  kind: 'ROLE',
  title: `Seat ${id}`,
  employment_type: 'FULL_TIME',
  status: 'FILLED',
  sort_order: 0,
  pay: [],
  monthly_cost: 0,
  ...over,
});

const serve = (nodes: TeamNode[]) => {
  apollo.query = {
    data: { teamStructure: { structure: { id: 's1', name: 'Core', currency: 'INR' }, nodes } },
    loading: false,
    error: undefined,
  };
};

const draftFor = (over: Record<string, unknown> = {}) => ({
  parent_id: null,
  kind: 'ROLE' as const,
  title: 'New',
  employment_type: 'FULL_TIME' as const,
  status: 'FILLED' as const,
  sort_order: 0,
  pay: [],
  ...over,
});

const written = () =>
  apollo.mutate.mock.calls.map(([call]) =>
    call.mutation === UPSERT_NODE ? { op: 'upsert', input: call.variables.input } : { op: 'delete', id: call.variables.id }
  );

beforeEach(() => {
  apollo.mutate.mockReset().mockResolvedValue({});
  apollo.refetch.mockReset().mockResolvedValue({});
  vi.mocked(notifyError).mockClear();
  serve([]);
});

describe('reading', () => {
  it('exposes the structure and its seats once loaded', () => {
    serve([seat('a')]);
    const { result } = renderHook(() => useTeamStructure('s1'));
    expect(result.current.structure).toMatchObject({ name: 'Core' });
    expect(result.current.nodes.map((n) => n.id)).toEqual(['a']);
    expect(result.current.loading).toBe(false);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('reports loading only until the first answer, with no seats meanwhile', () => {
    apollo.query = { data: undefined, loading: true, error: undefined };
    const { result } = renderHook(() => useTeamStructure('s1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.nodes).toEqual([]);
    expect(result.current.structure).toBeUndefined();
  });

  it('keeps showing the chart while it refetches in the background', () => {
    serve([seat('a')]);
    apollo.query.loading = true;
    expect(renderHook(() => useTeamStructure('s1')).result.current.loading).toBe(false);
  });

  it('passes a query error through', () => {
    const error = new Error('boom');
    apollo.query = { data: undefined, loading: false, error };
    expect(renderHook(() => useTeamStructure('s1')).result.current.error).toBe(error);
  });
});

describe('saving and undoing', () => {
  it('writes a new seat under a fresh 24-character id, refetches, and becomes undoable', async () => {
    const { result } = renderHook(() => useTeamStructure('s1'));
    await act(() => result.current.saveSeat(draftFor()));
    const [call] = apollo.mutate.mock.calls[0];
    expect(call.variables.structure_id).toBe('s1');
    expect(call.variables.input.id).toMatch(/^[0-9a-f]{24}$/);
    expect(apollo.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.busy).toBe(false);
  });

  it('keeps the id it was given when editing an existing seat', async () => {
    serve([seat('a', { title: 'Old' })]);
    const { result } = renderHook(() => useTeamStructure('s1'));
    await act(() => result.current.saveSeat(draftFor({ id: 'a', title: 'New' })));
    expect(written()).toEqual([{ op: 'upsert', input: expect.objectContaining({ id: 'a', title: 'New' }) }]);
  });

  it('undoes a new seat by deleting it, and redo recreates the same one', async () => {
    const { result } = renderHook(() => useTeamStructure('s1'));
    await act(() => result.current.saveSeat(draftFor()));
    const id = written()[0].input.id;
    apollo.mutate.mockClear();
    await act(() => result.current.undo());
    expect(written()).toEqual([{ op: 'delete', id }]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    apollo.mutate.mockClear();
    await act(() => result.current.redo());
    expect(written()).toEqual([{ op: 'upsert', input: expect.objectContaining({ id, title: 'New' }) }]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('undoes an edit by writing the old values back', async () => {
    serve([seat('a', { title: 'Old', person_name: 'Asha' })]);
    const { result } = renderHook(() => useTeamStructure('s1'));
    await act(() => result.current.saveSeat(draftFor({ id: 'a', title: 'New' })));
    apollo.mutate.mockClear();
    await act(() => result.current.undo());
    expect(written()).toEqual([{ op: 'upsert', input: expect.objectContaining({ id: 'a', title: 'Old', person_name: 'Asha' }) }]);
  });

  it('forgets what could be redone as soon as something new is saved', async () => {
    const { result } = renderHook(() => useTeamStructure('s1'));
    await act(() => result.current.saveSeat(draftFor({ title: 'One' })));
    await act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);
    await act(() => result.current.saveSeat(draftFor({ title: 'Two' })));
    expect(result.current.canRedo).toBe(false);
  });

  it('does nothing when there is nothing to undo or redo', async () => {
    const { result } = renderHook(() => useTeamStructure('s1'));
    await act(() => result.current.undo());
    await act(() => result.current.redo());
    expect(apollo.mutate).not.toHaveBeenCalled();
    expect(apollo.refetch).not.toHaveBeenCalled();
  });
});

describe('removing and undoing', () => {
  it('deletes a seat and undoes it by restoring the seat and re-attaching its children', async () => {
    serve([seat('top'), seat('mid', { parent_id: 'top' }), seat('kid', { parent_id: 'mid' })]);
    const { result } = renderHook(() => useTeamStructure('s1'));
    await act(() => result.current.removeSeat('mid'));
    expect(written()).toEqual([{ op: 'delete', id: 'mid' }]);
    apollo.mutate.mockClear();
    await act(() => result.current.undo());
    expect(written()).toEqual([
      { op: 'upsert', input: expect.objectContaining({ id: 'mid', parent_id: 'top' }) },
      { op: 'upsert', input: expect.objectContaining({ id: 'kid', parent_id: 'mid' }) },
    ]);
    apollo.mutate.mockClear();
    await act(() => result.current.redo());
    expect(written()).toEqual([{ op: 'delete', id: 'mid' }]);
  });

  it('ignores a seat that is not on the chart', async () => {
    const { result } = renderHook(() => useTeamStructure('s1'));
    await act(() => result.current.removeSeat('ghost'));
    expect(apollo.mutate).not.toHaveBeenCalled();
    expect(result.current.canUndo).toBe(false);
  });
});

describe('when the server refuses', () => {
  it('tells the user, refetches the real chart, and records nothing to undo', async () => {
    apollo.mutate.mockRejectedValueOnce(new Error('A seat cannot sit under itself or its own team'));
    const { result } = renderHook(() => useTeamStructure('s1'));
    await act(() => result.current.saveSeat(draftFor()));
    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining('under itself'));
    expect(apollo.refetch).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.busy).toBe(false);
  });

  it('leaves the history as it was when an undo fails, so it can be tried again', async () => {
    const { result } = renderHook(() => useTeamStructure('s1'));
    await act(() => result.current.saveSeat(draftFor()));
    apollo.mutate.mockRejectedValueOnce(new Error('offline'));
    await act(() => result.current.undo());
    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    apollo.mutate.mockResolvedValue({});
    await act(() => result.current.undo());
    expect(result.current.canUndo).toBe(false);
  });

  it('uses the delete mutation for removals', async () => {
    serve([seat('a')]);
    const { result } = renderHook(() => useTeamStructure('s1'));
    await act(() => result.current.removeSeat('a'));
    expect(apollo.mutate.mock.calls[0][0].mutation).toBe(DELETE_NODE);
  });
});
