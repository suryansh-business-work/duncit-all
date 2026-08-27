import type { AudienceRow } from '../helpers';

/** Columns are display-only — filtering lives in the sidebar — so the page only
 * hands them the admin-configured date format, and the one action a row can
 * carry. */
export interface AudienceColumnDeps {
  /** The admin-configured date/time formatter (rule 11). */
  formatDate: (date: Date) => string;
  /**
   * Take this person out of the saved list being rendered. Omitted by the open
   * audience directory and by the create wizard's preview: neither is showing a
   * list, so neither has anything to remove somebody from.
   */
  onRemove?: (row: AudienceRow) => void;
}
