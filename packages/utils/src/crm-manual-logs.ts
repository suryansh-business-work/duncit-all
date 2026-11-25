/**
 * A CRM lead's Manual Logs: the time windows, grouping by day, the
 * Created / Updated / Deleted history and the people the tab names. Shared by
 * the CRM portal's tab and the Duncit CRM app's, so both show the same logs.
 */
import type { CrmTone } from './crm-quality-labels';

export const CRM_LOG_GRANULARITIES = ['all', 'today', 'week', 'month'] as const;
export type CrmLogGranularity = (typeof CRM_LOG_GRANULARITIES)[number];

/** Literal keys per window, so the localization gate sees each one. */
export const CRM_LOG_GRANULARITY_LABEL: Readonly<Record<CrmLogGranularity, string>> = {
  all: 'crm.components.allTime',
  today: 'crm.components.today',
  week: 'crm.components.last7Days',
  month: 'crm.components.last30Days',
};

/** The history entries a manual log's changes leave (server: NOTE_AUDIT_TYPES). */
export const CRM_LOG_HISTORY_TYPES = ['NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_DELETED'] as const;
export type CrmLogHistoryType = (typeof CRM_LOG_HISTORY_TYPES)[number];

/** Keyed by the entry's type as the API sends it (a string), so any reader can look one up without a cast. */
export const CRM_LOG_HISTORY_VIEW: Readonly<Record<string, { labelKey: string; tone: CrmTone }>> = {
  NOTE_CREATED: { labelKey: 'crm.manualLogs.historyCreated', tone: 'success' },
  NOTE_UPDATED: { labelKey: 'crm.manualLogs.historyUpdated', tone: 'info' },
  NOTE_DELETED: { labelKey: 'crm.manualLogs.historyDeleted', tone: 'error' },
};

const HISTORY_TYPES = new Set<string>(CRM_LOG_HISTORY_TYPES);

export interface CrmLogActivity {
  id?: string | null;
  type: string;
  summary?: string | null;
  body_text?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_by?: string | null;
  deleted_by?: string | null;
}

/** A stable key for a log, even a legacy one written before logs had ids. */
export const crmLogKey = (activity: CrmLogActivity): string =>
  activity.id ?? `${activity.created_at ?? ''}|${activity.created_by ?? ''}|${activity.summary ?? ''}|${activity.body_text ?? ''}`;

function startOfWindow(granularity: CrmLogGranularity, now: Date): Date | null {
  const date = new Date(now.getTime());
  if (granularity === 'today') date.setHours(0, 0, 0, 0);
  else if (granularity === 'week') date.setDate(date.getDate() - 7);
  else if (granularity === 'month') date.setMonth(date.getMonth() - 1);
  else return null;
  return date;
}

const newestFirst = (a: CrmLogActivity, b: CrmLogActivity) =>
  new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();

function inWindow<T extends CrmLogActivity>(activities: readonly T[], granularity: CrmLogGranularity, types: readonly string[], now: Date): T[] {
  const cutoff = startOfWindow(granularity, now)?.getTime() ?? 0;
  return activities
    .filter((activity) => types.includes(activity.type))
    .filter((activity) => !cutoff || new Date(activity.created_at ?? 0).getTime() >= cutoff)
    .sort(newestFirst);
}

const dayKey = (iso?: string | null) => {
  const date = iso ? new Date(iso) : new Date(0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** Manual logs (deleted ones included, as placeholders) grouped by local day, newest first. */
export function crmGroupLogs<T extends CrmLogActivity>(
  activities: readonly T[],
  granularity: CrmLogGranularity,
  now: Date = new Date()
): Array<[string, T[]]> {
  const grouped = new Map<string, T[]>();
  for (const log of inWindow(activities, granularity, ['NOTE'], now)) {
    const key = dayKey(log.created_at);
    grouped.set(key, [...(grouped.get(key) ?? []), log]);
  }
  return Array.from(grouped.entries());
}

/** The Created / Updated / Deleted history of the logs in this window, newest first. */
export const crmLogHistory = <T extends CrmLogActivity>(activities: readonly T[], granularity: CrmLogGranularity, now: Date = new Date()): T[] =>
  inWindow(activities, granularity, CRM_LOG_HISTORY_TYPES, now);

/** Every user id the tab shows a name for: authors, editors, deleters and history actors. */
export function crmLogPeopleIds(activities: readonly CrmLogActivity[]): string[] {
  const ids = new Set<string>();
  for (const activity of activities) {
    if (activity.type !== 'NOTE' && !HISTORY_TYPES.has(activity.type)) continue;
    for (const id of [activity.created_by, activity.updated_by, activity.deleted_by]) if (id) ids.add(id);
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}
