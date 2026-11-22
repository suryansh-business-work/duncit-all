import type { CrmActivity } from '../../api/crm.types';
import type { Granularity } from './types';
import { formatDateTime } from '@duncit/app-settings';

/** The history entries a manual log's changes leave (server: NOTE_AUDIT_TYPES). */
export const LOG_HISTORY_TYPES = ['NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_DELETED'] as const;
export type LogHistoryType = (typeof LOG_HISTORY_TYPES)[number];
const HISTORY_TYPES = new Set<string>(LOG_HISTORY_TYPES);

export const formatLogTimestamp = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return formatDateTime(date);
};

export const logKey = (activity: CrmActivity) =>
  activity.id ?? `${activity.created_at ?? ''}|${activity.created_by ?? ''}|${activity.summary ?? ''}|${activity.body_text ?? ''}`;

function startOfWindow(granularity: Granularity): Date | null {
  const date = new Date();
  if (granularity === 'today') date.setHours(0, 0, 0, 0);
  else if (granularity === 'week') date.setDate(date.getDate() - 7);
  else if (granularity === 'month') date.setMonth(date.getMonth() - 1);
  else return null;
  return date;
}

const newestFirst = (a: CrmActivity, b: CrmActivity) =>
  new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();

function inWindow(activities: CrmActivity[], granularity: Granularity, types: readonly string[]) {
  const cutoff = startOfWindow(granularity)?.getTime() ?? 0;
  return activities
    .filter((activity) => types.includes(activity.type))
    .filter((activity) => !cutoff || new Date(activity.created_at ?? 0).getTime() >= cutoff)
    .sort(newestFirst);
}

/** Manual logs (deleted ones included, as placeholders) grouped by local day, newest first. */
export function groupLogs(activities: CrmActivity[], granularity: Granularity) {
  const grouped = new Map<string, CrmActivity[]>();
  for (const log of inWindow(activities, granularity, ['NOTE'])) {
    const date = log.created_at ? new Date(log.created_at) : new Date(0);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    grouped.set(key, [...(grouped.get(key) ?? []), log]);
  }
  return Array.from(grouped.entries());
}

/** The Created / Updated / Deleted history of the logs in this window, newest first. */
export const logHistory = (activities: CrmActivity[], granularity: Granularity) =>
  inWindow(activities, granularity, LOG_HISTORY_TYPES);

/** Every user id the tab shows a name for: authors, editors, deleters and history actors. */
export function peopleIds(activities: CrmActivity[]): string[] {
  const ids = new Set<string>();
  for (const activity of activities) {
    if (activity.type !== 'NOTE' && !HISTORY_TYPES.has(activity.type)) continue;
    for (const id of [activity.created_by, activity.updated_by, activity.deleted_by]) if (id) ids.add(id);
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}
