import { z } from 'zod';
import { rules, type Translate } from '../../../lib/validation';

/** An email to every confirmed guest, in the host's own words. */
export const makeUpdateSchema = (t: Translate) =>
  z.object({
    subject: rules.required(t, 120),
    body: rules.required(t, 5000),
  });

export type UpdateValues = z.infer<ReturnType<typeof makeUpdateSchema>>;
