import type { PodRequestLimitValues } from '@duncit/forms/schemas';

/** What the box holds while typing — text, so a blank box is refused rather than read as 0. */
export interface RequestLimitFormValues {
  limit: string;
}

/** What the shared schema hands back on a valid save. */
export type RequestLimitValues = PodRequestLimitValues;

export interface RequestLimitFormProps {
  /** "Maximum Host Requests / Month" or "Maximum Venue Requests / Month". */
  label: string;
  /** The partner's own saved cap. */
  limit: number;
  /** Set by Duncit (admin override) — it wins over the partner's own cap. */
  override?: number | null;
  saving: boolean;
  error: string | null;
  onSave: (limit: number) => Promise<void>;
}
