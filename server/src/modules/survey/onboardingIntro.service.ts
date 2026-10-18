import type { z } from 'zod';
import { validate } from '@utils/validate';
import { OnboardingIntroModel } from './onboardingIntro.model';
import {
  earnCardImagesSchema,
  socialHandlesSchema,
  type EarnCardImagesInput,
  type SocialHandlesInput,
} from './onboardingIntro.validator';

const SINGLETON_KEY = 'onboarding_intro';

const SOCIAL_KEYS = ['x_url', 'instagram_url', 'youtube_url', 'facebook_url', 'website_url'] as const;
type SocialKey = (typeof SOCIAL_KEYS)[number];

const EARN_CARD_KEYS = ['host', 'venue', 'ecomm', 'club', 'freelancer'] as const;
type EarnCardKey = (typeof EARN_CARD_KEYS)[number];

const pexels = (id: string) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&fit=crop`;

/** Shown on an Earn card until an Onboarding Admin picks its own image. */
const DEFAULT_EARN_CARD_IMAGES: Record<EarnCardKey, string> = {
  host: pexels('3768593'),
  venue: pexels('941861'),
  ecomm: pexels('6214476'),
  club: pexels('3184418'),
  freelancer: pexels('4050315'),
};

export type OnboardingSocialHandlesPub = Record<SocialKey, string>;
export type EarnCardImagesPub = Record<EarnCardKey, string>;

export interface OnboardingIntroPub {
  host_intro_html: string;
  venue_intro_html: string;
  ecomm_intro_html: string;
  club_admin_intro_html: string;
  social_handles: OnboardingSocialHandlesPub;
  earn_card_images: EarnCardImagesPub;
}

export interface UpdateOnboardingIntroInput {
  host_intro_html?: string | null;
  venue_intro_html?: string | null;
  ecomm_intro_html?: string | null;
  club_admin_intro_html?: string | null;
  social_handles?: SocialHandlesInput | null;
  earn_card_images?: EarnCardImagesInput | null;
}

type StoredSocialHandles = Partial<Record<SocialKey, string | null>> | null;
type StoredEarnCardImages = Partial<Record<EarnCardKey, string | null>> | null;

const socialHandlesPub = (stored?: StoredSocialHandles): OnboardingSocialHandlesPub => ({
  x_url: stored?.x_url ?? '',
  instagram_url: stored?.instagram_url ?? '',
  youtube_url: stored?.youtube_url ?? '',
  facebook_url: stored?.facebook_url ?? '',
  website_url: stored?.website_url ?? '',
});

/** Each card's own image, or Duncit's default when none is set. */
const earnCardImagesPub = (stored?: StoredEarnCardImages): EarnCardImagesPub => {
  const pub = { ...DEFAULT_EARN_CARD_IMAGES };
  for (const key of EARN_CARD_KEYS) {
    const image = stored?.[key];
    if (image) pub[key] = image;
  }
  return pub;
};

const toPub = (doc: {
  host_intro_html?: string | null;
  venue_intro_html?: string | null;
  ecomm_intro_html?: string | null;
  club_admin_intro_html?: string | null;
  social_handles?: StoredSocialHandles;
  earn_card_images?: StoredEarnCardImages;
}): OnboardingIntroPub => ({
  host_intro_html: doc.host_intro_html ?? '',
  venue_intro_html: doc.venue_intro_html ?? '',
  ecomm_intro_html: doc.ecomm_intro_html ?? '',
  club_admin_intro_html: doc.club_admin_intro_html ?? '',
  social_handles: socialHandlesPub(doc.social_handles),
  earn_card_images: earnCardImagesPub(doc.earn_card_images),
});

type Links<K extends string> = Partial<Record<K, string | null>>;

/** `<field>.<key>` for each link sent — a link left out keeps its stored value. */
async function linksUpdate<K extends string>(
  field: string,
  keys: readonly K[],
  schema: z.ZodType<Links<K>>,
  input?: Links<K> | null,
): Promise<Record<string, string>> {
  if (!input) return {};
  const links = await validate(schema, input);
  const update: Record<string, string> = {};
  for (const key of keys) {
    const link = links[key];
    if (link != null) update[`${field}.${key}`] = link;
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
    const update: Record<string, string> = {
      ...(await linksUpdate('social_handles', SOCIAL_KEYS, socialHandlesSchema, input.social_handles)),
      ...(await linksUpdate('earn_card_images', EARN_CARD_KEYS, earnCardImagesSchema, input.earn_card_images)),
    };
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
