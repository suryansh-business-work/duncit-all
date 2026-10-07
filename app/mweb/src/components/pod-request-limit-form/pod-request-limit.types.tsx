import type { z } from 'zod';
import {
  POD_REQUEST_LIMIT_MAX,
  makePodRequestLimitSchema,
  type PodRequestLimitValues,
} from '@duncit/forms/schemas';

/**
 * The monthly Pod Request cap — the shared rule (`@duncit/forms/schemas`), so
 * the Partners console, mWeb and native refuse the same input (rules 27 + 40).
 */
export { POD_REQUEST_LIMIT_MAX, makePodRequestLimitSchema, type PodRequestLimitValues };

/** What the box holds while typing (text) — the schema turns it into a whole number. */
export type PodRequestLimitInput = z.input<ReturnType<typeof makePodRequestLimitSchema>>;

export interface PodRequestLimitFormProps {
  /** "Maximum Host Requests / Month" or "Maximum Venue Requests / Month". */
  label: string;
  /** The partner's own saved cap. */
  initialLimit: number;
  /** An admin cap that wins over the partner's own; null when not set. */
  override: number | null;
  saving: boolean;
  error: string | null;
  onSubmit: (limit: number) => Promise<void>;
  testId: string;
}
