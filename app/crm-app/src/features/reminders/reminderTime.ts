import { endOfDay, startOfDay } from 'date-fns';
import { formatDateTime } from '@duncit/datetime';

/** Today's window, as the crmReminders filter wants it (ISO, the device's own day). */
export function todayWindow(now: Date = new Date()): { from: string; to: string } {
  return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
}

/** A reminder is overdue once its due time has passed and it is not done. */
export function isOverdue(reminder: { due_at: string; status: string }, now: Date = new Date()): boolean {
  return reminder.status !== 'DONE' && new Date(reminder.due_at).getTime() < now.getTime();
}

/** A date for display in the platform's format (the same formatter the portals use). */
export function displayDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatDateTime(date);
}
