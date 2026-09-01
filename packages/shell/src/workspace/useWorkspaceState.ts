import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { createLogger } from '@duncit/logs';
import type { DockEdge } from './context';
import {
  SAVE_SHELL_WORKSPACE_STATE,
  SHELL_WORKSPACE_STATE,
  type ShellWorkspaceStateDto,
} from './queries';

const logger = createLogger('portal');

/** How the reader has their console chrome arranged. */
export interface WorkspaceState {
  agentEdge: DockEdge;
  agentOffset: number;
  clockZone: string;
  clockSeconds: boolean;
  minimised: string[];
  sidebarCollapsed: boolean;
}

export const DEFAULT_WORKSPACE: WorkspaceState = {
  agentEdge: 'RIGHT',
  agentOffset: 0.5,
  clockZone: '',
  clockSeconds: false,
  minimised: [],
  sidebarCollapsed: false,
};

/** Client key to the server's field name — one place, so they cannot drift. */
const FIELD: Record<keyof WorkspaceState, string> = {
  agentEdge: 'agent_edge',
  agentOffset: 'agent_offset',
  clockZone: 'clock_zone',
  clockSeconds: 'clock_seconds',
  minimised: 'minimised',
  sidebarCollapsed: 'sidebar_collapsed',
};

const toState = (dto: ShellWorkspaceStateDto): WorkspaceState => ({
  agentEdge: dto.agent_edge === 'LEFT' ? 'LEFT' : 'RIGHT',
  agentOffset: dto.agent_offset,
  clockZone: dto.clock_zone,
  clockSeconds: dto.clock_seconds,
  minimised: dto.minimised,
  sidebarCollapsed: dto.sidebar_collapsed,
});

/**
 * How this person has their chrome arranged, kept on the server.
 *
 * Not localStorage, for the reason staff chat learnt the same lesson: the shell
 * renders in all seventeen consoles and each is its own origin, so per-browser
 * would mean per-portal — you would drag the Agent tab in admin and find it
 * back in the corner in finance.
 *
 * Writes are applied locally first and sent fire-and-forget: nobody should
 * watch a round trip to move a launcher. Each write carries only the field that
 * changed, so two consoles open at once cannot overwrite each other.
 */
export function useWorkspaceState(enabled: boolean) {
  const { data } = useQuery<{ shellWorkspaceState: ShellWorkspaceStateDto }>(
    SHELL_WORKSPACE_STATE,
    { fetchPolicy: 'cache-and-network', skip: !enabled }
  );
  const [save] = useMutation<any>(SAVE_SHELL_WORKSPACE_STATE);
  const [state, setState] = useState<WorkspaceState>(DEFAULT_WORKSPACE);

  /*
    Applied ONCE.

    Re-applying on every refetch would drag the tab back to whatever was saved
    while somebody was in the middle of moving it.
  */
  const [loaded, setLoaded] = useState(false);
  const server = data?.shellWorkspaceState;
  useEffect(() => {
    if (!server || loaded) return;
    setState(toState(server));
    setLoaded(true);
  }, [server, loaded]);

  // Read through a ref so `update` never changes identity: the provider hands
  // it to every open window, and a new function each render would re-register
  // all of them on every keystroke elsewhere in the page.
  const canSave = useRef(enabled);
  canSave.current = enabled;

  const update = useCallback(
    (patch: Readonly<Partial<WorkspaceState>>) => {
      setState((current) => ({ ...current, ...patch }));
      if (!canSave.current) return;
      const input: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        input[FIELD[key as keyof WorkspaceState]] = value;
      }
      save({ variables: { input } }).catch((error: unknown) => {
        logger.warn('workspace', 'saveShellWorkspaceState', {
          error,
          msg: 'Could not save the console arrangement',
        });
      });
    },
    [save]
  );

  return { state, update };
}
