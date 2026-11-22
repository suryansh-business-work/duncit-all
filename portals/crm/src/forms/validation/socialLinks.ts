import { z } from 'zod';
import type { useTranslation } from '@duncit/shell';
import type { CrmSocialLink } from '../../api/crm.types';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Caps shared with the server (`cleanSocialLinks` in crm.service.ts). */
export const SOCIAL_LINK_MAX = 20;
export const SOCIAL_NAME_MAX = 60;

export const emptySocialLink: CrmSocialLink = { name: '', url: '' };

/** A web address: parsed by the URL parser, http(s) only — never "javascript:". */
export function isWebUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * The extra social links every lead form has (beyond its main Instagram link).
 * A row left completely blank is allowed and dropped on save; a row with a
 * name needs its link, and every link must be a full web address.
 */
export const socialLinksSchema = (t: Translate) =>
  z
    .array(
      z
        .object({
          name: z.string().trim().max(SOCIAL_NAME_MAX, t('crm.forms.socialNameTooLong', { vars: { max: SOCIAL_NAME_MAX } })),
          url: z
            .string()
            .trim()
            .max(2048, t('crm.forms.socialLinkTooLong'))
            .refine((v) => v === '' || isWebUrl(v), t('crm.forms.socialLinkInvalid')),
        })
        .superRefine((row, ctx) => {
          if (row.name.trim() && !row.url.trim()) {
            ctx.addIssue({ code: 'custom', path: ['url'], message: t('crm.forms.socialLinkRequired') });
          }
        })
    )
    .max(SOCIAL_LINK_MAX, t('crm.forms.socialLinksTooMany', { vars: { max: SOCIAL_LINK_MAX } }));

/**
 * A lead form's schema plus its social links. An intersection rather than
 * `.extend()`, because some lead schemas carry refinements, which Zod refuses
 * to extend. `withInstagram` adds the main Instagram field for a schema that
 * predates it (venue leads).
 */
export function withSocialLinks<S extends z.ZodType>(schema: S, t: Translate, withInstagram = false) {
  const extra = z.object({
    social_links: socialLinksSchema(t),
    ...(withInstagram
      ? {
          instagram_link: z
            .string()
            .trim()
            .max(2048, t('crm.forms.socialLinkTooLong'))
            .refine((v) => v === '' || isWebUrl(v), t('crm.forms.socialLinkInvalid')),
        }
      : {}),
  });
  return schema.and(extra);
}

/** Form rows → API input: trimmed, blank rows dropped. */
export const cleanSocialLinks = (rows: CrmSocialLink[] | undefined): CrmSocialLink[] =>
  (rows ?? [])
    .map((row) => ({ name: row.name.trim(), url: row.url.trim() }))
    .filter((row) => row.url !== '');

/** API value → form rows (a lead saved before the field existed has none). */
export const socialLinksToForm = (links: CrmSocialLink[] | null | undefined): CrmSocialLink[] =>
  (links ?? []).map((link) => ({ name: link.name ?? '', url: link.url ?? '' }));
