import { z } from 'zod';
import { rules, type Translate } from '../../../lib/validation';

/** The short code printed on a guest's ticket. */
export const makeCheckInSchema = (t: Translate) => z.object({ code: rules.required(t, 20) });

export type CheckInValues = z.infer<ReturnType<typeof makeCheckInSchema>>;
