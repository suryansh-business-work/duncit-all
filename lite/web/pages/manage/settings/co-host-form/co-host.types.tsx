import { z } from 'zod';
import { rules, type Translate } from '../../../../lib/validation';

/** The email of a Lite account to add as a co-host. */
export const makeCoHostSchema = (t: Translate) => z.object({ email: rules.email(t) });

export type CoHostValues = z.infer<ReturnType<typeof makeCoHostSchema>>;
