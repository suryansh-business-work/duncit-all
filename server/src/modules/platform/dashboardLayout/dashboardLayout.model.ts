import mongoose, { Schema, type Document } from 'mongoose';

/** One widget's place on the grid, in GridStack's own column/row units. */
export interface IDashboardLayoutItem {
  widget_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Where one person has dragged the widgets of one dashboard.
 *
 * Keyed on (user_id, dashboard_id) rather than stored on the user document:
 * a staff member reads several consoles, each console has several dashboards,
 * and every one of them is arranged independently. An ABSENT document means
 * "never customised" — the client then renders the dashboard's own defaults,
 * which is also what Reset restores by deleting the row.
 *
 * Only positions live here. The widget CATALOGUE is code — a widget the running
 * build no longer defines is ignored on read, and a widget added since the last
 * save falls back to its default slot, so a stored layout can never pin the UI
 * to a shape the portal has moved past.
 */
export interface IDashboardLayout extends Document {
  user_id: mongoose.Types.ObjectId;
  /** Stable dashboard key, namespaced by portal — e.g. `admin.overview`. */
  dashboard_id: string;
  items: IDashboardLayoutItem[];
  created_at: Date;
  updated_at: Date;
}

const dashboardLayoutItemSchema = new Schema<IDashboardLayoutItem>(
  {
    widget_id: { type: String, required: true, trim: true },
    x: { type: Number, required: true, min: 0 },
    y: { type: Number, required: true, min: 0 },
    w: { type: Number, required: true, min: 1 },
    h: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const dashboardLayoutSchema = new Schema<IDashboardLayout>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dashboard_id: { type: String, required: true, trim: true },
    items: { type: [dashboardLayoutItemSchema], default: [] },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// One arrangement per person per dashboard — the upsert in the service relies
// on this being unique, not just indexed.
dashboardLayoutSchema.index({ user_id: 1, dashboard_id: 1 }, { unique: true });

export const DashboardLayoutModel =
  (mongoose.models.DashboardLayout as mongoose.Model<IDashboardLayout>) ||
  mongoose.model<IDashboardLayout>('DashboardLayout', dashboardLayoutSchema);
