import { z } from 'zod';
import { AI_MODEL_ID } from '@duncit/regex';
import { intField, type Translate } from '../fields';

/** Settings › Embeddings — the same bounds the server enforces. */

export const makeEmbeddingsSchema = (t: Translate) =>
  z
    .object({
      model: z.string().trim().regex(AI_MODEL_ID, t('intel.settings.common.modelId')),
      dimensions: intField(t, 64, 4096),
      chunk_chars: intField(t, 300, 6000),
      chunk_overlap: intField(t, 0, 2000),
      top_k: intField(t, 1, 12),
    })
    .refine((e) => e.chunk_overlap < e.chunk_chars / 2, { message: t('intel.settings.embeddings.overlapTooBig'), path: ['chunk_overlap'] });

export type EmbeddingsValues = z.input<ReturnType<typeof makeEmbeddingsSchema>>;
export type EmbeddingsOutput = z.output<ReturnType<typeof makeEmbeddingsSchema>>;
