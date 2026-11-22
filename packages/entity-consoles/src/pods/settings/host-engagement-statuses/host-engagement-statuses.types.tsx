/** One row of the engagement status editor. `key` is empty for a row added here and not yet saved. */
export interface EngagementStatusRow {
  key: string;
  label: string;
  is_active: boolean;
}

export interface HostEngagementStatusesValues {
  statuses: EngagementStatusRow[];
}

/** One status as the server returns it in `appSettings.host_engagement_statuses`. */
export interface SavedEngagementStatus {
  key: string;
  label: string;
  is_active: boolean;
}

export interface HostEngagementStatusesFormProps {
  /** The saved list (null until the settings query resolves). */
  value: SavedEngagementStatus[] | null;
  loading: boolean;
  onSave: (input: { host_engagement_statuses: Array<{ key?: string; label: string; is_active: boolean }> }) => Promise<void>;
}
