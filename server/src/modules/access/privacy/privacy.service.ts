import { Types } from 'mongoose';
import { logs } from '@observability/log';
import {
  TrackingConsentEventModel,
  type ITrackingConsentEvent,
  type TrackingConsentSurface,
} from './privacy.model';
import { exportUserData } from './privacy.export';

export interface TrackingConsentInput {
  analytics: boolean;
  marketing: boolean;
  surface: TrackingConsentSurface;
}

const toPub = (row: Pick<ITrackingConsentEvent, 'analytics' | 'marketing' | 'created_at'>) => ({
  analytics: row.analytics,
  marketing: row.marketing,
  decided_at: row.created_at.toISOString(),
});

export const privacyService = {
  /** The member's current tracking choice, or null while they have made none. */
  async mine(userId: string) {
    const row = await TrackingConsentEventModel.findOne({ user_id: new Types.ObjectId(userId) })
      .sort({ created_at: -1 })
      .lean();
    return row ? toPub(row) : null;
  },

  /** Record a new answer. Every answer is a new row — see privacy.model.ts. */
  async record(userId: string, input: TrackingConsentInput) {
    const row = await TrackingConsentEventModel.create({
      user_id: new Types.ObjectId(userId),
      analytics: input.analytics,
      marketing: input.marketing,
      surface: input.surface,
    });
    logs.server.info('privacy', 'trackingConsent', {
      user_id: userId,
      analytics: input.analytics,
      marketing: input.marketing,
      surface: input.surface,
    });
    return toPub(row);
  },

  exportMine(userId: string) {
    return exportUserData(userId);
  },
};

/**
 * Marketing messages are opt-IN for a new member (GDPR Art. 6(1)(a) /
 * ePrivacy Art. 13): the signup form's marketing box decides whether the
 * `marketing` category of email and WhatsApp starts on or off.
 *
 * Both answers are written, so the preference log shows when and where the
 * member said yes — the proof a consent needs. Members who joined before this
 * keep the state they already had.
 *
 * Never throws: the account already exists, and a preference write that
 * failed must not turn a finished signup into an error. A failure is logged
 * and the member can still change it on their Communication Preferences screen.
 */
export async function applySignupMarketingChoice(
  created: { _id: unknown; auth?: { email?: string | null } | null },
  optIn: boolean
): Promise<void> {
  const userId = String(created._id);
  const email = created.auth?.email ?? '';
  // Dynamic, like every other cross-module call on the signup path — the
  // preference services reach the email stack, and a static edge from the
  // auth module is how its import cycles started.
  const [{ mailPreferenceService }, { whatsappPreferenceService }] = await Promise.all([
    import('@modules/content/mailPreference/mailPreference.service'),
    import('@modules/platform/whatsapp/whatsapp.preference.service'),
  ]);
  const writes: Promise<unknown>[] = [
    whatsappPreferenceService.setMine(userId, 'marketing', optIn),
  ];
  if (email) writes.push(mailPreferenceService.apply(email, ['marketing'], optIn, false));
  const results = await Promise.allSettled(writes);
  for (const result of results) {
    if (result.status === 'rejected') {
      logs.server.warn('privacy', 'signupMarketingChoice', { error: result.reason, userId, optIn });
    }
  }
}
