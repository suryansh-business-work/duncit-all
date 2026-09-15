import * as yup from 'yup';
import { isValidObjectId } from 'mongoose';

/** Every operation here names one city by its Location `_id`. */
export const locationDocIdSchema = yup.object({
  location_doc_id: yup
    .string()
    .trim()
    .required('Choose a city')
    .test('object-id', 'Unknown city', (value) => isValidObjectId(value)),
});

export type LocationDocIdInput = yup.InferType<typeof locationDocIdSchema>;
