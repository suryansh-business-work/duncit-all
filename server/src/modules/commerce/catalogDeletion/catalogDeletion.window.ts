import { GraphQLError } from 'graphql';
import { fromZonedTime } from 'date-fns-tz';
import { appFormat, getAppTimeZone } from '@utils/app-time';
import {
  CatalogDeletionSettingsModel,
  DELETION_WINDOW_BOUNDS,
  type ICatalogDeletionSettings,
} from './catalogDeletion.model';

/**
 * The notice window a deletion date must fall in — min..max days from today,
 * counted in whole days in the admin's time zone (Admin › Settings), the same
 * calendar the partner's date picker shows.
 */

const SINGLETON = { singleton_key: 'catalog-deletion' };
const DAY_MS = 86_400_000;

async function getSettings(): Promise<ICatalogDeletionSettings> {
  const existing = await CatalogDeletionSettingsModel.findOne(SINGLETON);
  if (existing) return existing;
  const doc = await CatalogDeletionSettingsModel.findOneAndUpdate(
    SINGLETON,
    { $setOnInsert: SINGLETON },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (!doc) throw new Error('Deletion settings could not be created');
  return doc;
}

/** Today's calendar day in the app zone, as yyyy-MM-dd. */
const todayKey = (now: Date) => appFormat(now, 'yyyy-MM-dd');

/** A yyyy-MM-dd day `days` after another (calendar arithmetic, no zone drift). */
function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  return new Date(d.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export interface DeletionWindow {
  min_days: number;
  max_days: number;
  /** First and last day a deletion can be scheduled for, yyyy-MM-dd in the app zone. */
  earliest: string;
  latest: string;
  updated_at: string;
}

export async function deletionWindow(now = new Date()): Promise<DeletionWindow> {
  const s = await getSettings();
  const today = todayKey(now);
  return {
    min_days: s.min_days,
    max_days: s.max_days,
    earliest: addDays(today, s.min_days),
    latest: addDays(today, s.max_days),
    updated_at: s.updated_at?.toISOString?.() ?? '',
  };
}

/** The instant a picked day starts in the app zone — when the deletion becomes due. Refuses a day outside the window. */
export async function scheduledInstant(day: string, now = new Date()): Promise<Date> {
  const key = String(day ?? '').slice(0, 10);
  const win = await deletionWindow(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || key < win.earliest || key > win.latest) {
    throw new GraphQLError(`Pick a deletion date between ${win.earliest} and ${win.latest}`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return fromZonedTime(`${key}T00:00:00`, getAppTimeZone());
}

/** Products team: change the window. Whole days, inside the bounds, min never above max. */
export async function updateDeletionWindow(input: { min_days: number; max_days: number }, actorId: string) {
  const { min, max } = DELETION_WINDOW_BOUNDS;
  const lo = Math.floor(Number(input.min_days));
  const hi = Math.floor(Number(input.max_days));
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < min || hi > max || lo > hi) {
    throw new GraphQLError(`Minimum and maximum must be ${min}–${max} days, and the minimum cannot exceed the maximum`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const doc = await getSettings();
  doc.min_days = lo;
  doc.max_days = hi;
  doc.updated_by = actorId;
  await doc.save();
  return deletionWindow();
}
