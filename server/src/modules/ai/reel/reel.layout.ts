import mongoose, { Schema, type Document } from 'mongoose';
import { badInput } from './reel.shared';

/**
 * How one person has Reel Studio arranged: which panes are docked, popped out
 * into their own window or closed, how wide the docked ones are, and where a
 * popped one floats. Saved per person, not per browser, so the studio looks
 * the same on whichever computer they open it — and only when they press
 * Save layout; Restore view deletes the row and the studio's defaults return.
 *
 * The defaults and the limits a pane may be dragged within are the portal's
 * (it owns the screen); the server only refuses shapes no screen could hold.
 */

export const REEL_STUDIO_PANES = ['SOURCES', 'PREVIEW', 'SIDE', 'TIMELINE'] as const;
export type ReelStudioPaneId = (typeof REEL_STUDIO_PANES)[number];
export const REEL_STUDIO_PANE_MODES = ['DOCKED', 'POPPED', 'CLOSED'] as const;
export type ReelStudioPaneMode = (typeof REEL_STUDIO_PANE_MODES)[number];

export interface ReelStudioPane {
  id: ReelStudioPaneId;
  mode: ReelStudioPaneMode;
  /** Docked: the pane's width (the timeline's height) in CSS pixels. */
  size: number;
  /** Popped: the window's place and size in CSS pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
}

interface IReelStudioLayout extends Document {
  user_id: string;
  panes: ReelStudioPane[];
  updated_at: Date;
}

/** Larger than any screen; a value past it is a bug or a forged request, not a layout. */
const MAX_PX = 10_000;

const paneSchema = new Schema<ReelStudioPane>(
  {
    id: { type: String, enum: REEL_STUDIO_PANES, required: true },
    mode: { type: String, enum: REEL_STUDIO_PANE_MODES, required: true },
    size: { type: Number, default: 0 },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  { _id: false }
);

const layoutSchema = new Schema<IReelStudioLayout>(
  {
    user_id: { type: String, required: true, unique: true },
    panes: { type: [paneSchema], default: [] },
  },
  { collection: 'reel_studio_layouts', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ReelStudioLayoutModel =
  (mongoose.models.ReelStudioLayout as mongoose.Model<IReelStudioLayout> | undefined) ??
  mongoose.model<IReelStudioLayout>('ReelStudioLayout', layoutSchema);

const px = (value: number, field: string): number => {
  if (!Number.isFinite(value) || value < 0 || value > MAX_PX) throw badInput(`A pane's ${field} must be between 0 and ${MAX_PX} pixels.`);
  return Math.round(value);
};

/** The panes as they may be kept: each pane at most once, every number a size a screen could have. */
export function cleanPanes(panes: readonly ReelStudioPane[]): ReelStudioPane[] {
  const seen = new Set<ReelStudioPaneId>();
  return panes.map((pane) => {
    if (!REEL_STUDIO_PANES.includes(pane.id)) throw badInput(`There is no studio pane called ${String(pane.id)}.`);
    if (!REEL_STUDIO_PANE_MODES.includes(pane.mode)) throw badInput(`A pane is docked, popped or closed, not ${String(pane.mode)}.`);
    if (seen.has(pane.id)) throw badInput(`The ${pane.id} pane is listed twice.`);
    seen.add(pane.id);
    return {
      id: pane.id,
      mode: pane.mode,
      size: px(pane.size, 'size'),
      x: px(pane.x, 'left edge'),
      y: px(pane.y, 'top edge'),
      width: px(pane.width, 'width'),
      height: px(pane.height, 'height'),
    };
  });
}

const toPublic = (doc: IReelStudioLayout) => ({ panes: doc.panes, updated_at: doc.updated_at.toISOString() });

export const reelLayoutService = {
  /** The caller's saved arrangement, or null when they have never saved one. */
  async mine(userId: string) {
    const doc = await ReelStudioLayoutModel.findOne({ user_id: userId });
    return doc ? toPublic(doc) : null;
  },

  /** Replace the caller's arrangement with this one. */
  async save(userId: string, panes: readonly ReelStudioPane[]) {
    const doc = await ReelStudioLayoutModel.findOneAndUpdate(
      { user_id: userId },
      { $set: { panes: cleanPanes(panes) } },
      { upsert: true, new: true, runValidators: true }
    );
    return toPublic(doc);
  },

  /** Forget the caller's arrangement; true whether or not one was saved. */
  async reset(userId: string) {
    await ReelStudioLayoutModel.deleteOne({ user_id: userId });
    return true;
  },
};
