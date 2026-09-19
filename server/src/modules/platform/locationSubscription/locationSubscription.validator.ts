import * as yup from 'yup';

/** Every operation here names one city — by its Location `_id`, or by its slug
 * (`location_id`) as a shared waitlist link carries it. An unknown one is NOT_FOUND. */
export const locationDocIdSchema = yup.object({
  location_doc_id: yup.string().trim().required('Choose a city'),
});

export type LocationDocIdInput = yup.InferType<typeof locationDocIdSchema>;
