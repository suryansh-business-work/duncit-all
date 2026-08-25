import { createContext, useContext } from 'react';

/** Which side of the viewport the Agent tab is stuck to. */
export type DockEdge = 'LEFT' | 'RIGHT';

/**
 * Which icon the taskbar draws for a window — a KEY, not a React node.
 *
 * The registry lives in state that every open window writes to, and holding
 * elements in it would make each registration a new object identity and repaint
 * the whole bar. A key also keeps the registry describable in a test.
 */
export type WindowIcon = 'CALL' | 'CHAT' | 'WINDOW';

/** One thing running in the shell, as the taskbar sees it. */
export interface WorkspaceWindow {
  id: string;
  title: string;
  subtitle?: string;
  icon: WindowIcon;
}

/** Where the Agent tab sits: which edge, and how far down it (0 to 1). */
export interface AgentDock {
  edge: DockEdge;
  offset: number;
}

export interface WorkspaceValue {
  /** Everything currently running, in the order it opened. */
  windows: readonly WorkspaceWindow[];
  isMinimised: (id: string) => boolean;
  setMinimised: (id: string, minimised: boolean) => void;
  register: (window: WorkspaceWindow) => void;
  unregister: (id: string) => void;
  agent: AgentDock;
  moveAgent: (next: AgentDock) => void;
  /** IANA zone for the taskbar clock, or '' to follow the admin's setting. */
  clockZone: string;
  setClockZone: (zone: string) => void;
  clockSeconds: boolean;
  setClockSeconds: (on: boolean) => void;
  /** The permanent sidebar is minimised to its icon rail. */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const WorkspaceContext = createContext<WorkspaceValue | null>(null);

/**
 * The console's workspace, or NULL when rendered outside the shell.
 *
 * Null is a real answer rather than a thrown error: a floating window mounted
 * in a test or a storybook has no taskbar to minimise into, and it should still
 * work — it rolls up to its own title bar there, the way it did before there
 * was a taskbar at all.
 */
export function useWorkspace(): WorkspaceValue | null {
  return useContext(WorkspaceContext);
}
