import { z } from 'zod';

export const onboardingIntroSettingsSchema = z.object({
  host_intro_html: z.string(),
  venue_intro_html: z.string(),
  ecomm_intro_html: z.string(),
  club_admin_intro_html: z.string(),
});

export type OnboardingIntroSettingsValues = z.infer<typeof onboardingIntroSettingsSchema>;

export const BLANK_ONBOARDING_INTRO: OnboardingIntroSettingsValues = {
  host_intro_html: '',
  venue_intro_html: '',
  ecomm_intro_html: '',
  club_admin_intro_html: '',
};
