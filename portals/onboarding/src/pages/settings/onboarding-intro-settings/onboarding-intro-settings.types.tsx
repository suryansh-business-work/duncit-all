import { z } from 'zod';

/** A full web link — the survey pages open it as-is. The message is a localization key. */
const WEB_LINK = /^https?:\/\/\S+$/i;
const socialLink = z
  .string()
  .trim()
  .refine((value) => value === '' || WEB_LINK.test(value), { message: 'onboarding.settingsPage.socialLinkInvalid' });

export const socialHandlesSchema = z.object({
  x_url: socialLink,
  instagram_url: socialLink,
  youtube_url: socialLink,
  facebook_url: socialLink,
  website_url: socialLink,
});

export type SocialHandlesValues = z.infer<typeof socialHandlesSchema>;

export const onboardingIntroSettingsSchema = z.object({
  host_intro_html: z.string(),
  venue_intro_html: z.string(),
  ecomm_intro_html: z.string(),
  club_admin_intro_html: z.string(),
  social_handles: socialHandlesSchema,
});

export type OnboardingIntroSettingsValues = z.infer<typeof onboardingIntroSettingsSchema>;

export const BLANK_ONBOARDING_INTRO: OnboardingIntroSettingsValues = {
  host_intro_html: '',
  venue_intro_html: '',
  ecomm_intro_html: '',
  club_admin_intro_html: '',
  social_handles: { x_url: '', instagram_url: '', youtube_url: '', facebook_url: '', website_url: '' },
};
