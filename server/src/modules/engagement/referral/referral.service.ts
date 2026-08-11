import { randomBytes } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import {
  ReferralCodeModel,
  ReferralModel,
  ReferralSettingsModel,
  type IReferralSettings,
} from './referral.model';
import { coinService } from '@modules/finance/coin/coin.service';
import { coinSettingsService } from '@modules/finance/coin/coin.settings.service';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const badInput = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

/** Readable 8-char code, e.g. DUN-9F3A2C. */
const generateCode = () => `DUN-${randomBytes(3).toString('hex').toUpperCase()}`;

/**
 * The settings shape both the read and the write answer with.
 *
 * `coins_per_referral` is still reported here — the referral screens and the
 * share message are what quote it — but it is no longer OWNED here: it is one
 * of the coin payout rules, and all of those are edited together in Finance >
 * Duncit Coin > Settings. Reporting a number this page cannot change is the
 * point; it means the copy and the rate can never disagree.
 */
const settingsPub = (doc: IReferralSettings, coinsPerReferral: number) => ({
  gift_description: doc.gift_description ?? '',
  coins_per_referral: coinsPerReferral,
  share_message: doc.share_message ?? '',
});

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

/** Admin-log row mapper — shared by listAll and the table page. */
const toAdminPub = (r: any, names: Map<string, string>) => ({
  id: String(r._id),
  code: r.code,
  referrer_user_id: String(r.referrer_user_id),
  referrer_name: names.get(String(r.referrer_user_id)) || null,
  referred_user_id: String(r.referred_user_id),
  referred_name: names.get(String(r.referred_user_id)) || null,
  created_at: r.created_at.toISOString(),
});

/** Allowlists for the shared table engine (referralsTable — DUNCIT TABLE CONTRACT v1). */
const REFERRAL_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['code'],
  sortFields: {
    code: 'code',
    created_at: 'created_at',
  },
  filterFields: {
    code: { type: 'string' },
    referrer_user_id: { type: 'string' },
    referred_user_id: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

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
    const [settings, coinsPerReferral, referred, referredBy] = await Promise.all([
      getSettings(),
      coinSettingsService.coinsPerReferral(),
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
      coins_per_referral: coinsPerReferral,
      share_message: settings.share_message ?? '',
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

  /**
   * The owner of a code, or a refusal explaining why it cannot be used.
   *
   * Split out of applyCode because signup needs to ask the question BEFORE
   * there is an account to answer it for: a typo in the referral box must fail
   * the form the user is still looking at, not silently drop the reward after
   * the account already exists. `selfUserId` is omitted at signup for exactly
   * that reason — nobody can own the code of an account that does not exist.
   */
  async validateCode(rawCode: string, selfUserId?: string): Promise<string> {
    const code = (rawCode ?? '').trim().toUpperCase();
    if (!code) badInput('Enter a referral code');
    const owner = await ReferralCodeModel.findOne({ code });
    if (!owner) badInput('That referral code does not exist');
    const ownerId = owner!.user_id.toString();
    if (selfUserId && ownerId === selfUserId) badInput('You cannot redeem your own code');
    return ownerId;
  },

  /**
   * Record the referral and pay BOTH sides.
   *
   * The introduction is what earns, so it pays the moment it is made — and it
   * pays the person who made it and the person who arrived through it the same
   * flat amount. A flat number of coins rather than a share of a spend: neither
   * of them bought anything, and the new member may never buy anything either.
   *
   * The credits are best-effort — the referral is already recorded, and a
   * ledger briefly behind is a smaller problem than failing a request after two
   * accounts were linked. Each side is idempotent per (referral, source) in the
   * database, so a retry cannot pay either of them twice.
   */
  async link(referrerId: string, referredUserId: string, code: string) {
    const already = await ReferralModel.exists({ referred_user_id: referredUserId });
    if (already) badInput('A referral code was already applied to this account');
    const referral = await ReferralModel.create({
      referrer_user_id: new Types.ObjectId(referrerId),
      referred_user_id: new Types.ObjectId(referredUserId),
      code,
    });

    try {
      const coins = await coinSettingsService.coinsPerReferral();
      const referralId = String(referral._id);
      await coinService.creditForReferral({
        userId: referrerId,
        referralId,
        coins,
        reason: `Referral: ${code}`,
        source: 'REFERRAL_EARN',
      });
      await coinService.creditForReferral({
        userId: referredUserId,
        referralId,
        coins,
        reason: `Signed up with referral code ${code}`,
        source: 'REFERRAL_SIGNUP',
      });
    } catch (e) {
      logs.server.warn('referral', 'link', {
        error: e,
        msg: 'Referral coins not credited',
        code,
      });
    }
    return referral;
  },

  /** Redeem a code — once per account, never your own. */
  async applyCode(userId: string, rawCode: string) {
    const code = (rawCode ?? '').trim().toUpperCase();
    const referrerId = await this.validateCode(code, userId);
    await this.link(referrerId, userId, code);
    return this.myReferral(userId);
  },

  /** Admin: full who-referred-whom log, newest first. */
  async listAll() {
    const rows = await ReferralModel.find().sort({ created_at: -1 }).limit(500).lean();
    const names = await nameMap(
      rows.flatMap((r: any) => [String(r.referrer_user_id), String(r.referred_user_id)])
    );
    return rows.map((r: any) => toAdminPub(r, names));
  },

  /** Server-side table page (search/filter/sort/paginate) for referralsTable. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<any>(
      ReferralModel,
      {},
      input,
      REFERRAL_TABLE_CONFIG
    );
    const names = await nameMap(
      docs.flatMap((r: any) => [String(r.referrer_user_id), String(r.referred_user_id)])
    );
    return { rows: docs.map((r: any) => toAdminPub(r, names)), total, page, page_size };
  },

  async settings() {
    const [doc, coins] = await Promise.all([
      getSettings(),
      coinSettingsService.coinsPerReferral(),
    ]);
    return settingsPub(doc, coins);
  },

  /**
   * Finance: the gift copy and the share message.
   *
   * The rate they describe is NOT written here. It is a coin payout rule, and
   * every one of those is set in one place so no screen can quote a reward the
   * platform stopped paying — the share message reaches members with `{coins}`
   * still a placeholder precisely so it renders whatever the live rate is.
   */
  async updateSettings(input: {
    gift_description?: string | null;
    share_message?: string | null;
  }) {
    const doc = await getSettings();
    if (input.gift_description != null) doc.gift_description = input.gift_description;
    if (input.share_message != null) doc.share_message = input.share_message.trim();
    await doc.save();
    return settingsPub(doc, await coinSettingsService.coinsPerReferral());
  },
};
