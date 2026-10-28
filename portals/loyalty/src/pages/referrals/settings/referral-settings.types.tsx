import { z } from 'zod';
import { REFERRAL_MESSAGE_TOKENS } from '@duncit/utils';
import type { Translator } from '@duncit/app-settings';
import type { ReferralSettings } from '../queries';

/** The longest share message and gift line the server stores. */
export const SHARE_MESSAGE_MAX = 500;
export const GIFT_LINE_MAX = 300;

export const referralTokenList = REFERRAL_MESSAGE_TOKENS.join(', ');

/*
  `coins_per_referral` is deliberately absent from this form. It is one of the
  coin payout rules, and all of them are set together on Duncit Coin > Coin
  Settings so no screen can quote a reward the platform stopped paying. This
  page still READS it — the preview has to show members the real number.

  The link is the point of sharing, so the message has to carry it. Everything
  else is optional — a member can read their code out loud, and the coin count
  is a promise not every campaign wants to make — but a message without {link}
  sends people nowhere, and nothing downstream can add one back.
*/
export const makeReferralSettingsSchema = (t: Translator['t']) =>
  z.object({
    gift_description: z
      .string()
      .trim()
      .max(GIFT_LINE_MAX, t('loyalty.referrals.giftLineMax', { vars: { max: GIFT_LINE_MAX } })),
    share_message: z
      .string()
      .trim()
      .max(SHARE_MESSAGE_MAX, t('loyalty.referrals.shareMessageMax', { vars: { max: SHARE_MESSAGE_MAX } }))
      .refine(
        (value) => value === '' || value.includes('{link}'),
        t('loyalty.referrals.shareMessageNeedsLink', { vars: { tokens: referralTokenList } })
      ),
  });

export type ReferralSettingsValues = z.infer<ReturnType<typeof makeReferralSettingsSchema>>;

export const BLANK_SETTINGS: ReferralSettingsValues = { gift_description: '', share_message: '' };

/** Server payload -> form strings. */
export const toFormValues = (settings: ReferralSettings): ReferralSettingsValues => ({
  gift_description: settings.gift_description,
  share_message: settings.share_message,
});

export interface ReferralSettingsFormProps {
  settings: ReferralSettings;
  /** Where a member's referral link lands — the preview shows the URL they would send. */
  signupBaseUrl: string;
  busy: boolean;
  /** The analyst seat reads the settings but is never offered Save. */
  canWrite: boolean;
  errorMessage?: string | null;
  onSubmit: (values: ReferralSettingsValues) => Promise<void> | void;
}
