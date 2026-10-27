import type { LiteSocialKey, LiteSocialLinks } from '../../shared/graphql/documents';
import { isHttpUrl } from './validation';

/** The networks a profile links to, in the order the form and the profile list them; the website is a full link. */
export const SOCIAL_FIELDS: readonly LiteSocialKey[] = ['instagram', 'x', 'youtube', 'tiktok', 'linkedin', 'website'];

/** The fixed address in front of each handle, so a host types just their name on that network. */
export const SOCIAL_PREFIX: Record<LiteSocialKey, string> = {
  instagram: 'instagram.com/',
  x: 'x.com/',
  youtube: 'youtube.com/@',
  tiktok: 'tiktok.com/@',
  linkedin: 'linkedin.com/in/',
  website: '',
};

export interface SocialLink {
  key: LiteSocialKey;
  href: string;
}

/** The links a profile has filled in, in display order; a website that is not an http(s) link is left out. */
export function socialLinks(social: Partial<LiteSocialLinks> | null | undefined): SocialLink[] {
  return SOCIAL_FIELDS.flatMap((key): SocialLink[] => {
    const value = social?.[key]?.trim() ?? '';
    if (key === 'website') return isHttpUrl(value) ? [{ key, href: value }] : [];
    return value ? [{ key, href: `https://${SOCIAL_PREFIX[key]}${encodeURIComponent(value)}` }] : [];
  });
}
