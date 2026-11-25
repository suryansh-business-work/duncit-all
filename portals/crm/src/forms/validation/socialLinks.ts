import type { CrmSocialLink } from '../../api/crm.types';

/**
 * The social links rules live in @duncit/forms/schemas, shared with the Duncit
 * CRM Android app; re-exported here under the names the portal forms import.
 */
export { isWebUrl, SOCIAL_LINK_MAX, SOCIAL_NAME_MAX, socialLinksSchema, withSocialLinks } from '@duncit/forms/schemas';

export const emptySocialLink: CrmSocialLink = { name: '', url: '' };

/** Form rows → API input: trimmed, blank rows dropped. */
export const cleanSocialLinks = (rows: CrmSocialLink[] | undefined): CrmSocialLink[] =>
  (rows ?? [])
    .map((row) => ({ name: row.name.trim(), url: row.url.trim() }))
    .filter((row) => row.url !== '');

/** API value → form rows (a lead saved before the field existed has none). */
export const socialLinksToForm = (links: CrmSocialLink[] | null | undefined): CrmSocialLink[] =>
  (links ?? []).map((link) => ({ name: link.name ?? '', url: link.url ?? '' }));
