import { DOCK_EDGES, ShellStateModel, type DockEdge, type IShellState } from './shellState.model';

/**
 * The caller's console chrome arrangement.
 *
 * Every read answers with a complete shape — an absent document is "never
 * arranged anything", not an error — and every write takes only the fields it
 * was given, so a console saving a clock preference cannot blank the Agent
 * tab's position that another open console just moved.
 */

/** What the shell reads, with every default filled in. */
export interface ShellWorkspaceState {
  agent_edge: DockEdge;
  agent_offset: number;
  clock_zone: string;
  clock_seconds: boolean;
  minimised: string[];
  sidebar_collapsed: boolean;
}

/** A window id is a shell constant; the cap is what stops an unbounded array. */
const MAX_MINIMISED = 20;
const MAX_ZONE_LENGTH = 64;
const EDGES = new Set<string>(DOCK_EDGES);

const toState = (doc: Partial<IShellState> | null): ShellWorkspaceState => ({
  agent_edge: doc?.agent_edge ?? 'RIGHT',
  agent_offset: doc?.agent_offset ?? 0.5,
  clock_zone: doc?.clock_zone ?? '',
  clock_seconds: doc?.clock_seconds ?? false,
  minimised: doc?.minimised ?? [],
  sidebar_collapsed: doc?.sidebar_collapsed ?? false,
});

/**
 * Only the fields that arrived, each narrowed to something the shell can render.
 *
 * The input comes from a browser, so an unknown edge, an offset of 40 or a
 * thousand window ids are all reachable. None of them is worth an error —
 * they are dropped or clamped, because a preference that fails to save is a
 * worse outcome than one that saves the nearest sane value.
 */
function sanitise(input: Readonly<Record<string, unknown>>): Partial<ShellWorkspaceState> {
  const patch: Partial<ShellWorkspaceState> = {};
  if (typeof input.agent_edge === 'string' && EDGES.has(input.agent_edge)) {
    patch.agent_edge = input.agent_edge as DockEdge;
  }
  if (typeof input.agent_offset === 'number' && Number.isFinite(input.agent_offset)) {
    patch.agent_offset = Math.min(Math.max(input.agent_offset, 0), 1);
  }
  if (typeof input.clock_zone === 'string') {
    patch.clock_zone = input.clock_zone.trim().slice(0, MAX_ZONE_LENGTH);
  }
  if (typeof input.clock_seconds === 'boolean') {
    patch.clock_seconds = input.clock_seconds;
  }
  if (typeof input.sidebar_collapsed === 'boolean') {
    patch.sidebar_collapsed = input.sidebar_collapsed;
  }
  if (Array.isArray(input.minimised)) {
    patch.minimised = [
      ...new Set(input.minimised.filter((id): id is string => typeof id === 'string' && id !== '')),
    ].slice(0, MAX_MINIMISED);
  }
  return patch;
}

export const shellStateService = {
  /** The caller's arrangement, defaults filled in. */
  async state(userId: string): Promise<ShellWorkspaceState> {
    const doc = await ShellStateModel.findOne({ user_id: userId }).lean<IShellState | null>();
    return toState(doc);
  },

  /** Write the fields that arrived and answer with the whole arrangement. */
  async save(
    userId: string,
    input: Readonly<Record<string, unknown>>
  ): Promise<ShellWorkspaceState> {
    const patch = sanitise(input);
    const doc = await ShellStateModel.findOneAndUpdate(
      { user_id: userId },
      { $set: patch },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean<IShellState>();
    return toState(doc);
  },
};
