import type { HostEngagementStatusOption } from '../queries';

export interface HostEngagementValues {
  status_key: string;
  note: string;
}

export interface HostEngagementFormProps {
  /** Every configured status, in order; only active ones are offered. */
  statuses: HostEngagementStatusOption[];
  /** What the host is filed under now. */
  value: HostEngagementValues;
  updatedAt?: string | null;
  onSubmit: (values: HostEngagementValues) => Promise<void>;
}
