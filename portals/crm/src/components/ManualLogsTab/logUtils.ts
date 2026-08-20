import type { CrmActivity } from '../../api/crm.types';
import type { Granularity } from './types';
import { formatDateTime } from '@duncit/app-settings';

export const formatLogTimestamp = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return formatDateTime(date);
};

export const logKey = (activity: CrmActivity) =>
  `${activity.created_at ?? ''}|${activity.created_by ?? ''}|${activity.summary ?? ''}|${activity.body_text ?? ''}`;

function startOfWindow(granularity: Granularity): Date | null {
  const date = new Date();
  if (granularity === 'today') date.setHours(0, 0, 0, 0);
  else if (granularity === 'week') date.setDate(date.getDate() - 7);
  else if (granularity === 'month') date.setMonth(date.getMonth() - 1);
  else return null;
  return date;
}

export function groupLogs(activities: CrmActivity[], granularity: Granularity) {
  const cutoff = startOfWindow(granularity)?.getTime() ?? 0;
  const logs = activities
    .filter((activity) => activity.type === 'NOTE')
    .filter((activity) => !cutoff || new Date(activity.created_at ?? 0).getTime() >= cutoff);
  logs.sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  );
  const grouped = new Map<string, CrmActivity[]>();
  for (const log of logs) {
    const date = log.created_at ? new Date(log.created_at) : new Date(0);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    grouped.set(key, [...(grouped.get(key) ?? []), log]);
  }
  return Array.from(grouped.entries());
}
