import { z } from 'zod';
import type { Translate } from './media-name.types';

/** The 120-character cap matches the server's, so a name that saves is never cut. */
export const MEDIA_NAME_MAX = 120;

export const mediaNameSchema = (t: Translate) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t('crm.media.nameRequired'))
      .max(MEDIA_NAME_MAX, t('crm.media.nameTooLong', { vars: { max: MEDIA_NAME_MAX } })),
  });

export type MediaNameFormValues = z.infer<ReturnType<typeof mediaNameSchema>>;
