/**
 * Duncit's social links, set by an Onboarding Admin beside the intro copy and
 * shown with their icons on the Host, Venue and Club Admin survey pages. mWeb
 * and native draw their own icons (MUI vs @expo/vector-icons); which links show,
 * and in what order, is decided here once.
 */

/** Display order — also the `OnboardingSocialHandles` GraphQL fields. */
export const SOCIAL_HANDLE_KEYS = ['x_url', 'instagram_url', 'youtube_url', 'facebook_url', 'website_url'] as const;

export type SocialHandleKey = (typeof SOCIAL_HANDLE_KEYS)[number];

/** `onboardingIntro.social_handles`, as both apps select it. */
export type SocialHandles = Record<SocialHandleKey, string>;

export interface SocialHandleLink {
  key: SocialHandleKey;
  url: string;
}

/** The links an admin filled in, trimmed, in display order — blank ones are left out. */
export function socialHandleLinks(handles?: Partial<Record<SocialHandleKey, string | null>> | null): SocialHandleLink[] {
  return SOCIAL_HANDLE_KEYS.map((key) => ({ key, url: (handles?.[key] ?? '').trim() })).filter((link) => link.url);
}
