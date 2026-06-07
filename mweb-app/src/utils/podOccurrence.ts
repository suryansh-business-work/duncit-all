/**
 * Human labels for the server's PodOccurrence enum — single source of truth so
 * raw values like "ONE_TIME" never reach the UI. Mirrors the mobile app's
 * `POD_OCCURRENCE_LABELS`.
 */
export const POD_OCCURRENCE_LABELS: Record<string, string> = {
  ONE_TIME: 'One time',
  DAILY: 'Daily',
  ALTERNATE_DAY: 'Alternate day',
  WEEKENDS_ONLY: 'Weekends only',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
};

/** Human occurrence label from the enum value, e.g. "ONE_TIME" → "One time". */
export function podOccurrenceLabel(occurrence?: string | null): string {
  if (!occurrence) return '';
  return POD_OCCURRENCE_LABELS[occurrence] ?? occurrence.replace(/_/g, ' ');
}
