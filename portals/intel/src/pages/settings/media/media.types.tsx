import { z } from 'zod';
import { AI_MODEL_ID } from '@duncit/regex';
import { intField, type Translate } from '../fields';

/** Settings › Media & Uploads — the same bounds the server enforces. */

/** The file types Intel can read (what the extractor supports — capability, not policy). */
export const SUPPORTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain', 'text/markdown', 'text/csv'] as const;
export const VISIBILITIES = ['PRIVATE', 'TEAM', 'ADMINS'] as const;

export const makeMediaSchema = (t: Translate) =>
  z.object({
    max_file_mb: intField(t, 1, 100),
    allowed_types: z.array(z.enum(SUPPORTED_TYPES)).min(1, t('intel.settings.media.typesRequired')),
    auto_index: z.boolean(),
    ocr_images: z.boolean(),
    extract_pdf: z.boolean(),
    default_visibility: z.enum(VISIBILITIES),
    vision_model: z.string().trim().regex(AI_MODEL_ID, t('intel.settings.common.modelId')),
  });

export type MediaValues = z.input<ReturnType<typeof makeMediaSchema>>;
export type MediaOutput = z.output<ReturnType<typeof makeMediaSchema>>;
