import { randomBytes } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { ReferralCodeModel, ReferralModel, ReferralSettingsModel } from './referral.model';

const badInput = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

/** Readable 8-char code, e.g. DUN-9F3A2C. */
const generateCode = () => `DUN-${randomBytes(3).toString('hex').toUpperCase()}`;

async function getSettings() {
  let doc = await ReferralSettingsModel.findOne({ singleton_key: 'referral' });
  if (!doc) doc = await ReferralSettingsModel.create({ singleton_key: 'referral' });
  return doc;
}

async function nameMap(ids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const users = await UserModel.find({ _id: { $in: unique } })
    .select('profile.first_name profile.last_name')
    .lean();
  return new Map(
    users.map((u: any) => [
      String(u._id),
      `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim(),
    ])
  );
}

export const referralService = {
  /** The viewer's code (lazily created) + gift + redemptions + who referred them. */
  async myReferral(userId: string) {
    let codeDoc = await ReferralCodeModel.findOne({ user_id: userId });
    if (!codeDoc) {
      // Retry once on the (astronomically unlikely) code collision.
      try {
        codeDoc = await ReferralCodeModel.create({ user_id: userId, code: generateCode() });
      } catch {
        codeDoc = await ReferralCodeModel.create({ user_id: userId, code: generateCode() });
      }
    }
    const [settings, referred, referredBy] = await Promise.all([
      getSettings(),
      ReferralModel.find({ referrer_user_id: userId }).sort({ created_at: -1 }).lean(),
      ReferralModel.findOne({ referred_user_id: userId }).lean(),
    ]);
    const names = await nameMap([
      ...referred.map((r: any) => String(r.referred_user_id)),
      ...(referredBy ? [String(referredBy.referrer_user_id)] : []),
    ]);
    return {
      code: codeDoc.code,
      gift_description: settings.gift_description ?? '',
      referred: referred.map((r: any) => ({
        user_id: String(r.referred_user_id),
        full_name: names.get(String(r.referred_user_id)) || null,
        referred_at: r.created_at.toISOString(),
      })),
      referred_by_name: referredBy
        ? names.get(String(referredBy.referrer_user_id)) || null
        : null,
    };
  },

  /** Redeem a code — once per account, never your own. */
  async applyCode(userId: string, rawCode: string) {
    const code = (rawCode ?? '').trim().toUpperCase();
    if (!code) badInput('Enter a referral code');
    const owner = await ReferralCodeModel.findOne({ code });
    if (!owner) badInput('That referral code does not exist');
    if (String(owner!.user_id) === userId) badInput('You cannot redeem your own code');
    const already = await ReferralModel.exists({ referred_user_id: userId });
    if (already) badInput('A referral code was already applied to this account');
    await ReferralModel.create({
      referrer_user_id: owner!.user_id,
      referred_user_id: new Types.ObjectId(userId),
      code,
    });
    return this.myReferral(userId);
  },

  /** Admin: full who-referred-whom log, newest first. */
  async listAll() {
    const rows = await ReferralModel.find().sort({ created_at: -1 }).limit(500).lean();
    const names = await nameMap(
      rows.flatMap((r: any) => [String(r.referrer_user_id), String(r.referred_user_id)])
    );
    return rows.map((r: any) => ({
      id: String(r._id),
      code: r.code,
      referrer_user_id: String(r.referrer_user_id),
      referrer_name: names.get(String(r.referrer_user_id)) || null,
      referred_user_id: String(r.referred_user_id),
      referred_name: names.get(String(r.referred_user_id)) || null,
      created_at: r.created_at.toISOString(),
    }));
  },

  async settings() {
    const doc = await getSettings();
    return { gift_description: doc.gift_description ?? '' };
  },

  async updateGift(gift: string) {
    const doc = await getSettings();
    doc.gift_description = gift ?? '';
    await doc.save();
    return { gift_description: doc.gift_description };
  },
};
