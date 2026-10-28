import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { DELETE_NODE, TEAM_STRUCTURE, UPSERT_NODE } from './queries';
import {
  emptyHistory,
  record,
  redoSteps,
  stepBack,
  stepForward,
  undoSteps,
  type Action,
  type History,
  type Step,
} from './history';
import { draftOf, type NodeDraft, type TeamNode, type TeamStructureInfo } from './types';

interface StructureData {
  teamStructure: { structure: TeamStructureInfo; nodes: TeamNode[] };
}

/**
 * One structure's seats plus every edit made to them, with undo and redo.
 *
 * Each edit is written to the server straight away (no Save button, nobody
 * loses a chart to a closed tab) and recorded as an Action. Undo replays the
 * inverse writes, so it is as durable as the edit it reverses and another HR
 * seat sees it too.
 */
export function useTeamStructure(structureId: string) {
  const client = useApolloClient();
  const { data, loading, error, refetch } = useQuery<StructureData>(TEAM_STRUCTURE, {
    variables: { id: structureId },
    fetchPolicy: 'cache-and-network',
  });
  const nodes = useMemo(() => data?.teamStructure.nodes ?? [], [data]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // The stacks live in a ref so a keyboard shortcut always reads the latest;
  // the state copy is only what re-renders the toolbar buttons.
  const history = useRef<History>(emptyHistory());
  const [flags, setFlags] = useState({ canUndo: false, canRedo: false });
  const [busy, setBusy] = useState(false);
  const publish = (next: History) => {
    history.current = next;
    setFlags({ canUndo: next.past.length > 0, canRedo: next.future.length > 0 });
  };

  const run = useCallback(
    async (steps: Step[]) => {
      for (const step of steps) {
        if (step.type === 'upsert') {
          await client.mutate({ mutation: UPSERT_NODE, variables: { structure_id: structureId, input: step.draft } });
        } else {
          await client.mutate({ mutation: DELETE_NODE, variables: { id: step.id } });
        }
      }
      await refetch();
    },
    [client, structureId, refetch],
  );

  /** Runs the writes; on failure tells the user and leaves history as it was. */
  const attempt = useCallback(
    async (steps: Step[], onDone: () => void) => {
      setBusy(true);
      try {
        await run(steps);
        onDone();
      } catch (err) {
        notifyError(parseApiError(err));
        await refetch();
      } finally {
        setBusy(false);
      }
    },
    [run, refetch],
  );

  const saveSeat = useCallback(
    (draft: NodeDraft) => {
      const existing = draft.id ? nodesRef.current.find((n) => n.id === draft.id) : undefined;
      // A new seat gets its id here, so redo recreates the same one and a
      // child added under it afterwards still points at a seat that exists.
      const after: NodeDraft = { ...draft, id: draft.id ?? crypto.randomUUID().replaceAll('-', '').slice(0, 24) };
      const action: Action = { type: 'save', before: existing ? draftOf(existing) : null, after };
      return attempt([{ type: 'upsert', draft: after }], () => publish(record(history.current, action)));
    },
    [attempt],
  );

  const removeSeat = useCallback(
    (id: string) => {
      const seat = nodesRef.current.find((n) => n.id === id);
      if (!seat) return Promise.resolve();
      const children = nodesRef.current.filter((n) => n.parent_id === id).map(draftOf);
      const action: Action = { type: 'remove', seat: draftOf(seat), children };
      return attempt([{ type: 'delete', id }], () => publish(record(history.current, action)));
    },
    [attempt],
  );

  const undo = useCallback(() => {
    const back = stepBack(history.current);
    return back ? attempt(undoSteps(back.action), () => publish(back.next)) : Promise.resolve();
  }, [attempt]);

  const redo = useCallback(() => {
    const forward = stepForward(history.current);
    return forward ? attempt(redoSteps(forward.action), () => publish(forward.next)) : Promise.resolve();
  }, [attempt]);

  return {
    structure: data?.teamStructure.structure,
    nodes,
    loading: loading && !data,
    error,
    busy,
    saveSeat,
    removeSeat,
    undo,
    redo,
    ...flags,
  };
}
