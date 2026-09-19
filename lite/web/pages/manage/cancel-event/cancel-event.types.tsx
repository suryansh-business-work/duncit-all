import { z } from 'zod';
import { rules, type Translate } from '../../../lib/validation';

/** Why the event is off — sent to every guest, so a sentence is enough. */
export const makeCancelEventSchema = (t: Translate) => z.object({ reason: rules.optional(t, 300) });

export type CancelEventValues = z.infer<ReturnType<typeof makeCancelEventSchema>>;
