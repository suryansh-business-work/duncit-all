import { z } from 'zod';
import { filled, obj, shape, str, trim } from '@utils/zod-fields';

/** Every operation here names one city — by its Location `_id`, or by its slug
 * (`location_id`) as a shared waitlist link carries it. An unknown one is NOT_FOUND. */
export const locationDocIdSchema = obj(
  shape({
    location_doc_id: str(z.string().check(filled('Choose a city')), { required: 'Choose a city', transforms: [trim] }),
  })
);

export type LocationDocIdInput = z.infer<typeof locationDocIdSchema>;
