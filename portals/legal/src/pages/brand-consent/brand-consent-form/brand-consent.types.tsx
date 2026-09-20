import { z } from 'zod';
import { htmlToText } from '@duncit/rich-text';
import type { useTranslation } from '@duncit/shell';

/**
 * The Brand Consent as Legal edits it — one policy record with a fixed slug,
 * so only the wording, its title and whether it is published are editable.
 */
export interface BrandConsentFormValues {
  title: string;
  /** HTML from the rich-text editor. */
  content: string;
  is_active: boolean;
}

export const BRAND_CONSENT_TITLE_MAX = 160;
/** Judged on the text a partner reads, not on the markup around it. */
export const BRAND_CONSENT_CONTENT_MIN = 20;

type Translate = ReturnType<typeof useTranslation>['t'];

/** Built from `t` so every message reads in the editor's language (rule 38). */
export const brandConsentSchema = (t: Translate) =>
  z.object({
    title: z
      .string()
      .trim()
      .min(1, t('legal.brandConsent.titleRequired'))
      .max(BRAND_CONSENT_TITLE_MAX, t('legal.brandConsent.titleTooLong')),
    content: z
      .string()
      .refine((html) => htmlToText(html).length > 0, t('legal.brandConsent.contentRequired'))
      .refine(
        (html) => htmlToText(html).length >= BRAND_CONSENT_CONTENT_MIN,
        t('legal.brandConsent.contentTooShort'),
      ),
    is_active: z.boolean(),
  });

/** A consent that does not exist yet starts unpublished: nobody signs a draft. */
export const EMPTY_BRAND_CONSENT: BrandConsentFormValues = {
  title: '',
  content: '',
  is_active: false,
};
