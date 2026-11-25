import { z } from 'zod';

import type { Translate } from './translate';

/**
 * Renaming an image in a CRM library (a lead's Logos & Images, the email brand
 * library). Moved here from the CRM portal so the portal and the Duncit CRM app
 * refuse the same name with the same sentence.
 */

/** The 120-character cap matches the server's, so a name that saves is never cut. */
export const MEDIA_NAME_MAX = 120;

export const makeMediaNameSchema = (t: Translate) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t('crm.media.nameRequired'))
      .max(MEDIA_NAME_MAX, t('crm.media.nameTooLong', { vars: { max: MEDIA_NAME_MAX } })),
  });

export type MediaNameValues = z.infer<ReturnType<typeof makeMediaNameSchema>>;
