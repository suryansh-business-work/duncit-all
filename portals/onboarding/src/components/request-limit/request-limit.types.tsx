import type { z } from 'zod';
import type { makePodRequestOverrideSchema } from '@duncit/forms/schemas';

type RequestLimitSchema = ReturnType<typeof makePodRequestOverrideSchema>;

/** What the box holds while typing: text, where '' means "not set". */
export type RequestLimitInput = z.input<RequestLimitSchema>;

/** What a save sends: a whole number, or null for the default of 10. */
export type RequestLimitValues = z.output<RequestLimitSchema>;

export interface RequestLimitFormProps {
  /** `podRequests.venueLimitLabel` or `podRequests.hostLimitLabel`, translated. */
  label: string;
  /** The stored admin limit; null / undefined when an admin never set one. */
  limit: number | null | undefined;
  saving: boolean;
  /** Persists the limit (null clears it). Rejects when the server refuses. */
  onSave: (limit: number | null) => Promise<void>;
  testId: string;
}
