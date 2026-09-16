import { OnboardingIntroModel } from './onboardingIntro.model';

const SINGLETON_KEY = 'onboarding_intro';

export interface OnboardingIntroPub {
  host_intro_html: string;
  venue_intro_html: string;
  ecomm_intro_html: string;
  club_admin_intro_html: string;
}

export interface UpdateOnboardingIntroInput {
  host_intro_html?: string | null;
  venue_intro_html?: string | null;
  ecomm_intro_html?: string | null;
  club_admin_intro_html?: string | null;
}

const toPub = (doc: {
  host_intro_html?: string | null;
  venue_intro_html?: string | null;
  ecomm_intro_html?: string | null;
  club_admin_intro_html?: string | null;
}): OnboardingIntroPub => ({
  host_intro_html: doc.host_intro_html ?? '',
  venue_intro_html: doc.venue_intro_html ?? '',
  ecomm_intro_html: doc.ecomm_intro_html ?? '',
  club_admin_intro_html: doc.club_admin_intro_html ?? '',
});

export const onboardingIntroService = {
  async get(): Promise<OnboardingIntroPub> {
    let doc = await OnboardingIntroModel.findOne({ singleton_key: SINGLETON_KEY });
    if (!doc) doc = await OnboardingIntroModel.create({ singleton_key: SINGLETON_KEY });
    return toPub(doc);
  },

  async update(input: UpdateOnboardingIntroInput): Promise<OnboardingIntroPub> {
    const update: Record<string, string> = {};
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
