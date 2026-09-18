import { z } from 'zod';
import type { Translate } from '../../../lib/translate';

/** Mirrors `storeBulkFile(pet_type_ids, category_ids)` — at least one of the two must be chosen. */
export const makeBulkFileSchema = (t: Translate) =>
  z
    .object({ pet_type_ids: z.array(z.string()), category_ids: z.array(z.string()) })
    .refine((values) => values.pet_type_ids.length + values.category_ids.length > 0, {
      path: ['pet_type_ids'],
      message: t('ecommPortal.products.fileChooseOne'),
    });

export type BulkFileValues = z.infer<ReturnType<typeof makeBulkFileSchema>>;

export const BULK_FILE_DEFAULTS: BulkFileValues = { pet_type_ids: [], category_ids: [] };
