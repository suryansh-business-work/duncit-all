import { validate } from '@utils/validate';
import { OnboardingIntroModel } from './onboardingIntro.model';
import { socialHandlesSchema, type SocialHandlesInput } from './onboardingIntro.validator';

const SINGLETON_KEY = 'onboarding_intro';

const SOCIAL_KEYS = ['x_url', 'instagram_url', 'youtube_url', 'facebook_url', 'website_url'] as const;
type SocialKey = (typeof SOCIAL_KEYS)[number];

export type OnboardingSocialHandlesPub = Record<SocialKey, string>;

export interface OnboardingIntroPub {
  host_intro_html: string;
  venue_intro_html: string;
  ecomm_intro_html: string;
  club_admin_intro_html: string;
  social_handles: OnboardingSocialHandlesPub;
}

export interface UpdateOnboardingIntroInput {
  host_intro_html?: string | null;
  venue_intro_html?: string | null;
  ecomm_intro_html?: string | null;
  club_admin_intro_html?: string | null;
  social_handles?: SocialHandlesInput | null;
}

type StoredSocialHandles = Partial<Record<SocialKey, string | null>> | null;

const socialHandlesPub = (stored?: StoredSocialHandles): OnboardingSocialHandlesPub => ({
  x_url: stored?.x_url ?? '',
  instagram_url: stored?.instagram_url ?? '',
  youtube_url: stored?.youtube_url ?? '',
  facebook_url: stored?.facebook_url ?? '',
  website_url: stored?.website_url ?? '',
});

const toPub = (doc: {
  host_intro_html?: string | null;
  venue_intro_html?: string | null;
  ecomm_intro_html?: string | null;
  club_admin_intro_html?: string | null;
  social_handles?: StoredSocialHandles;
}): OnboardingIntroPub => ({
  host_intro_html: doc.host_intro_html ?? '',
  venue_intro_html: doc.venue_intro_html ?? '',
  ecomm_intro_html: doc.ecomm_intro_html ?? '',
  club_admin_intro_html: doc.club_admin_intro_html ?? '',
  social_handles: socialHandlesPub(doc.social_handles),
});

/** `social_handles.<key>` for each link sent — a link left out keeps its stored value. */
async function socialHandlesUpdate(input?: SocialHandlesInput | null): Promise<Record<string, string>> {
  if (!input) return {};
  const links = await validate<SocialHandlesInput>(socialHandlesSchema, input);
  const update: Record<string, string> = {};
  for (const key of SOCIAL_KEYS) {
    const link = links[key];
    if (link != null) update[`social_handles.${key}`] = link;
  }
  return update;
}

export const onboardingIntroService = {
  async get(): Promise<OnboardingIntroPub> {
    let doc = await OnboardingIntroModel.findOne({ singleton_key: SINGLETON_KEY });
    if (!doc) doc = await OnboardingIntroModel.create({ singleton_key: SINGLETON_KEY });
    return toPub(doc);
  },

  async update(input: UpdateOnboardingIntroInput): Promise<OnboardingIntroPub> {
    const update: Record<string, string> = await socialHandlesUpdate(input.social_handles);
    if (input.host_intro_html != null) update.host_intro_html = input.host_intro_html;
    if (input.venue_intro_html != null) update.venue_intro_html = input.venue_intro_html;
    if (input.ecomm_intro_html != null) update.ecomm_intro_html = input.ecomm_intro_html;
    if (input.club_admin_intro_html != null) update.club_admin_intro_html = input.club_admin_intro_html;
    const doc = await OnboardingIntroModel.findOneAndUpdate(
      { singleton_key: SINGLETON_KEY },
      { $set: update },
      { new: true, upsert: true },
    );
    return toPub(doc);
  },
};
