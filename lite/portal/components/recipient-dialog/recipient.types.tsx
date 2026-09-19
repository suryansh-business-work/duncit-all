import { z } from 'zod';
import type { Translate } from '@duncit/forms/schemas';

export interface RecipientValues {
  to: string;
}

/** One address, trimmed and lowercased. */
export const makeRecipientSchema = (t: Translate) =>
  z.object({
    to: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, t('litePortal.validation.required', { vars: { field: t('litePortal.common.recipient') } }))
      .email(t('litePortal.validation.email')),
  });
