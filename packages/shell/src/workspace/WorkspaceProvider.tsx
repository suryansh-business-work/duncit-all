import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  WorkspaceContext,
  type AgentDock,
  type WorkspaceValue,
  type WorkspaceWindow,
} from './context';
import { useWorkspaceState } from './useWorkspaceState';

export interface WorkspaceProviderProps {
  /**
   * There is a signed-in reader, so the arrangement can be read and saved.
   * While false the shell still works — it simply runs on the defaults rather
   * than firing an authenticated query nobody can answer yet.
   */
  enabled: boolean;
  children: ReactNode;
}

/** Same window, same details — nothing to write. */
const same = (a: WorkspaceWindow, b: WorkspaceWindow): boolean =>
  a.title === b.title && a.subtitle === b.subtitle && a.icon === b.icon;

/**
 * The desk every console shares: what is running, what is rolled up to the
 * taskbar, and where this reader keeps the Agent tab.
 *
 * A registry rather than props threaded down from AppShell, because the things
 * that appear in the taskbar are not children of it — a call window opens over
 * the page from inside the chat panel, and the panel itself is a sibling of the
 * page. They announce themselves; the bar draws whatever announced itself.
 */
export function WorkspaceProvider({ enabled, children }: Readonly<WorkspaceProviderProps>) {
  const { state, update } = useWorkspaceState(enabled);
  const [windows, setWindows] = useState<WorkspaceWindow[]>([]);

  /*
    The minimised list, mirrored in a ref.

    Two windows can close in the same tick (a call ending takes its recorder
    with it), and reading the list from state inside the callback would give
    both of them the same pre-update value — the second write would then put
    the first one's id back.
  */
  const minimised = useRef(state.minimised);
  minimised.current = state.minimised;

  const setMinimised = useCallback(
    (id: string, value: boolean) => {
      const current = minimised.current;
      if (current.includes(id) === value) return;
      const next = value ? [...current, id] : current.filter((entry) => entry !== id);
      minimised.current = next;
      update({ minimised: next });
    },
    [update]
  );

  const register = useCallback((window: WorkspaceWindow) => {
    setWindows((current) => {
      const index = current.findIndex((entry) => entry.id === window.id);
      if (index === -1) return [...current, window];
      // Identity matters: an unchanged registration that still returned a new
      // array would repaint the bar on every render of the window inside it.
      if (same(current[index], window)) return current;
      const next = [...current];
      next[index] = window;
      return next;
    });
  }, []);

  const unregister = useCallback(
    (id: string) => {
      setWindows((current) => current.filter((entry) => entry.id !== id));
      // A window that CLOSED is not a window that is minimised — leaving the
      // flag behind would reopen it invisible the next time it is needed.
      setMinimised(id, false);
    },
    [setMinimised]
  );

  const moveAgent = useCallback(
    (next: AgentDock) => update({ agentEdge: next.edge, agentOffset: next.offset }),
    [update]
  );
  const setClockZone = useCallback((zone: string) => update({ clockZone: zone }), [update]);
  const setClockSeconds = useCallback((on: boolean) => update({ clockSeconds: on }), [update]);
  const setSidebarCollapsed = useCallback(
    (collapsed: boolean) => update({ sidebarCollapsed: collapsed }),
    [update]
  );

  const value = useMemo<WorkspaceValue>(
    () => ({
      windows,
      isMinimised: (id: string) => state.minimised.includes(id),
      setMinimised,
      register,
      unregister,
      agent: { edge: state.agentEdge, offset: state.agentOffset },
      moveAgent,
      clockZone: state.clockZone,
      setClockZone,
      clockSeconds: state.clockSeconds,
      setClockSeconds,
      sidebarCollapsed: state.sidebarCollapsed,
      setSidebarCollapsed,
    }),
    [
      windows,
      state,
      setMinimised,
      register,
      unregister,
      moveAgent,
      setClockZone,
      setClockSeconds,
      setSidebarCollapsed,
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
