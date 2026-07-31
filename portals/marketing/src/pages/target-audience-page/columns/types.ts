/** Columns are display-only — filtering lives in the sidebar — so the only
 * thing they need from the page is the admin-configured date format. */
export interface AudienceColumnDeps {
  /** The admin-configured date/time formatter (rule 11). */
  formatDate: (date: Date) => string;
}
