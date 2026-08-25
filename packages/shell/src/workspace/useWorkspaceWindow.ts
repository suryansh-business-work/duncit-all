import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspace, type WorkspaceWindow } from './context';

export interface WorkspaceWindowHandle {
  /** Rolled up to the taskbar — the window itself should render nothing. */
  minimised: boolean;
  /** True when there is a taskbar to minimise INTO. */
  docked: boolean;
  minimise: () => void;
  restore: () => void;
}

/**
 * Put one window on the taskbar for as long as it is open.
 *
 * Pass null when the window is closed: it unregisters, and its minimised flag
 * goes with it, so reopening it later never comes back invisible.
 *
 * Outside the shell — a test, a storybook — there is no taskbar, so minimising
 * falls back to local state and the window rolls up to its own title bar
 * instead. `docked` is what tells it which of the two it is doing.
 */
export function useWorkspaceWindow(window: WorkspaceWindow | null): WorkspaceWindowHandle {
  const workspace = useWorkspace();
  const [local, setLocal] = useState(false);

  /*
    The registry is reached through a ref, not the effect's dependency list.

    Registering CHANGES the workspace value — that is the whole point of it —
    so depending on the value itself would unregister and re-register on every
    change, which is a loop. Its `register`/`unregister` are stable callbacks,
    so reading the latest value at effect time is the same call either way.
  */
  const api = useRef(workspace);
  api.current = workspace;

  const id = window?.id ?? '';
  const title = window?.title ?? '';
  const subtitle = window?.subtitle;
  const icon = window?.icon;

  useEffect(() => {
    const registry = api.current;
    if (!registry || !id || !icon) return undefined;
    registry.register({ id, title, subtitle, icon });
    return () => registry.unregister(id);
  }, [id, title, subtitle, icon]);

  const docked = Boolean(workspace && id);
  const minimised = docked ? Boolean(workspace?.isMinimised(id)) : local;

  const set = useCallback(
    (value: boolean) => {
      const registry = api.current;
      if (registry && id) {
        registry.setMinimised(id, value);
        return;
      }
      setLocal(value);
    },
    [id]
  );

  const minimise = useCallback(() => set(true), [set]);
  const restore = useCallback(() => set(false), [set]);

  return { minimised, docked, minimise, restore };
}
