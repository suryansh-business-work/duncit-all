import { z } from 'zod';
import { rules, type Translate } from '../../../../lib/validation';

/** A new public link for the event: the part after /e/. */
export const makeEventLinkSchema = (t: Translate) => z.object({ slug: rules.slug(t) });

export type EventLinkValues = z.infer<ReturnType<typeof makeEventLinkSchema>>;
