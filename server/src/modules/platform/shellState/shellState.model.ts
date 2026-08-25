import mongoose, { Schema, type Document } from 'mongoose';

/**
 * How one person has their console chrome arranged — the taskbar along the
 * bottom of every portal and the Agent tab stuck to its edge.
 *
 * On the server rather than in localStorage for the same reason staff chat's
 * state is: the shell renders in all seventeen consoles and each one is its own
 * origin, so "per browser" actually means "per portal you happen to have open".
 * Dragging the Agent tab in admin and finding it back in the corner in finance
 * is not a preference, it is a bug.
 *
 * One document per user, upserted. Nothing here is sensitive and nothing here
 * is authoritative — a missing document simply means "never arranged anything",
 * which is what the defaults below describe.
 */

/** Which side of the viewport the Agent tab is stuck to. */
export const DOCK_EDGES = ['LEFT', 'RIGHT'] as const;
export type DockEdge = (typeof DOCK_EDGES)[number];

export interface IShellState extends Document {
  user_id: string;
  agent_edge: DockEdge;
  /**
   * How far down its edge the Agent tab sits, as a FRACTION of the usable
   * height rather than a pixel offset — the same person reads a console on a
   * laptop and on a 4K monitor, and a stored 900px is off-screen on one of them.
   */
  agent_offset: number;
  /** IANA zone for the taskbar clock, or '' to follow the admin's setting. */
  clock_zone: string;
  /** Seconds in the taskbar clock. Off by default — it is a glance, not a stopwatch. */
  clock_seconds: boolean;
  /**
   * Window ids currently rolled up to the taskbar.
   *
   * Kept so a refresh returns the desk you left rather than reopening every
   * panel over the page — the same reason a taskbar remembers it in a desktop OS.
   */
  minimised: string[];
  /**
   * The permanent sidebar is minimised to its icon rail.
   *
   * A reading preference and not a viewport one: somebody who works from the
   * icons wants them in every console they open, which is exactly what a
   * per-browser flag cannot give them.
   */
  sidebar_collapsed: boolean;
  created_at: Date;
  updated_at: Date;
}

const shellStateSchema = new Schema<IShellState>(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    agent_edge: { type: String, enum: DOCK_EDGES, default: 'RIGHT' },
    // Bounded in the model as well as the client: this is written straight from
    // a mutation, and an offset of 40 puts the launcher where nobody can reach it.
    agent_offset: { type: Number, default: 0.5, min: 0, max: 1 },
    clock_zone: { type: String, default: '' },
    clock_seconds: { type: Boolean, default: false },
    minimised: { type: [String], default: [] },
    sidebar_collapsed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ShellStateModel =
  (mongoose.models.ShellState as mongoose.Model<IShellState>) ||
  mongoose.model<IShellState>('ShellState', shellStateSchema);
