import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  DashboardLayoutModel,
  type IDashboardLayout,
  type IDashboardLayoutItem,
} from './dashboardLayout.model';

/**
 * A dashboard cannot plausibly hold more widgets than this, so a larger payload
 * is a client bug or an attempt to grow one user's document without bound.
 */
const MAX_ITEMS = 200;
/** GridStack's own maximum column count — nothing can sit outside it. */
const MAX_SPAN = 12;
/** Deep pages scroll; a row index beyond this is nonsense, not a tall widget. */
const MAX_ROW = 1000;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(Math.round(value), min), max);

function assertDashboardId(dashboardId: string): string {
  const id = dashboardId.trim();
  if (!id) {
    throw new GraphQLError('dashboard_id is required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return id;
}

/**
 * Positions arrive from a browser, so they are clamped rather than trusted:
 * the grid is 12 columns wide and a widget is at least one cell, which bounds
 * every field. Anything with no widget_id is dropped — it could never match a
 * catalogue entry on read anyway.
 */
function sanitiseItems(items: readonly IDashboardLayoutItem[]): IDashboardLayoutItem[] {
  if (items.length > MAX_ITEMS) {
    throw new GraphQLError(`A dashboard layout cannot hold more than ${MAX_ITEMS} widgets`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const seen = new Set<string>();
  const clean: IDashboardLayoutItem[] = [];
  for (const item of items) {
    const widgetId = item.widget_id?.trim();
    if (!widgetId || seen.has(widgetId)) continue;
    seen.add(widgetId);
    const w = clamp(item.w, 1, MAX_SPAN);
    clean.push({
      widget_id: widgetId,
      x: clamp(item.x, 0, MAX_SPAN - w),
      y: clamp(item.y, 0, MAX_ROW),
      w,
      h: clamp(item.h, 1, MAX_ROW),
    });
  }
  return clean;
}

export const dashboardLayoutService = {
  /** The caller's saved arrangement, or null when they have never saved one. */
  async myLayout(userId: string, dashboardId: string): Promise<IDashboardLayout | null> {
    return DashboardLayoutModel.findOne({
      user_id: new Types.ObjectId(userId),
      dashboard_id: assertDashboardId(dashboardId),
    }).lean<IDashboardLayout | null>();
  },

  /** Replace the caller's arrangement of one dashboard. */
  async save(
    userId: string,
    dashboardId: string,
    items: readonly IDashboardLayoutItem[]
  ): Promise<IDashboardLayout> {
    const id = assertDashboardId(dashboardId);
    const doc = await DashboardLayoutModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId), dashboard_id: id },
      { $set: { items: sanitiseItems(items) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean<IDashboardLayout>();
    return doc;
  },

  /** Delete the caller's arrangement so the dashboard's defaults apply again. */
  async reset(userId: string, dashboardId: string): Promise<boolean> {
    await DashboardLayoutModel.deleteOne({
      user_id: new Types.ObjectId(userId),
      dashboard_id: assertDashboardId(dashboardId),
    });
    return true;
  },
};
