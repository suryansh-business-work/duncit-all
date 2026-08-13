import { CoinSettingsModel, type ICoinSettings } from './coin.model';
import { AppSettingsModel } from '@modules/platform/settings/settings.model';
import { ReferralSettingsModel } from '@modules/engagement/referral/referral.model';
import type { PaymentTargetType } from '@modules/finance/payment/payment.model';
import { logs } from '@observability/log';

/**
 * The coin payout policy: every rule deciding how many coins someone is given.
 *
 * Kept out of coin.service.ts on purpose — that file is on the payment path and
 * stays small — and out of AppSettings because this is money policy owned by
 * Finance, whose role cannot even write AppSettings (its update mutation is
 * gated on SUPER_ADMIN + TECH_MANAGER).
 */

const SINGLETON = { singleton_key: 'coin' };

/** A percent that is legitimately allowed to be 0. `value || DEFAULT` would
 * quietly turn "stop paying this reward" back into the default rate, which is
 * the same trap the AppSettings clamps document. */
const cleanPct = (value: unknown, fallback: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
};

const cleanCoins = (value: unknown, fallback: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
};

const settingsPub = (doc: ICoinSettings) => ({
  pod_join_earn_pct: doc.pod_join_earn_pct,
  shop_earn_pct: doc.shop_earn_pct,
  coins_per_referral: doc.coins_per_referral,
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

export const coinSettingsService = {
  /** The singleton, created with schema defaults the first time it is asked for. */
  async get(): Promise<ICoinSettings> {
    const doc = await CoinSettingsModel.findOneAndUpdate(
      SINGLETON,
      { $setOnInsert: SINGLETON },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return doc!;
  },

  async pub() {
    return settingsPub(await this.get());
  },

  /**
   * The rate that applies to one payment. A pod ticket and a shop order are
   * priced differently — a physical product carries a cost of goods a seat in a
   * pod does not — so they earn at their own rates. `OTHER` is a catch-all with
   * no shop economics behind it, so it follows the pod rate.
   *
   * A GIFT_CARD purchase earns NOTHING: the card converts to coins on
   * redemption, so paying an earn rate on top would mint loyalty value out of
   * buying stored value.
   */
  async earnPctFor(targetType: PaymentTargetType | null | undefined): Promise<number> {
    if (targetType === 'GIFT_CARD') return 0;
    const doc = await this.get();
    return targetType === 'PRODUCT' ? doc.shop_earn_pct : doc.pod_join_earn_pct;
  },

  /** Flat coins paid to each side of a referral. */
  async coinsPerReferral(): Promise<number> {
    return (await this.get()).coins_per_referral;
  },

  async update(input: {
    pod_join_earn_pct?: number | null;
    shop_earn_pct?: number | null;
    coins_per_referral?: number | null;
  }) {
    const doc = await this.get();
    if (input.pod_join_earn_pct != null) {
      doc.pod_join_earn_pct = cleanPct(input.pod_join_earn_pct, doc.pod_join_earn_pct);
    }
    if (input.shop_earn_pct != null) {
      doc.shop_earn_pct = cleanPct(input.shop_earn_pct, doc.shop_earn_pct);
    }
    if (input.coins_per_referral != null) {
      doc.coins_per_referral = cleanCoins(input.coins_per_referral, doc.coins_per_referral);
    }
    await doc.save();
    return settingsPub(doc);
  },

  /**
   * Carry the rates that already exist into their new home, once.
   *
   * The earn rate used to live on `AppSettings.coin_earn_pct` and the referral
   * amount on `ReferralSettings.coins_per_referral`. Both fields are gone from
   * their mongoose schemas now, so they are read straight off the collections —
   * a modelled read would strip exactly the values being rescued. Without this,
   * a deploy silently resets a platform that had, say, 3% configured back to the
   * shipped 10%.
   *
   * Runs only when the singleton does not exist yet, so it can never overwrite a
   * rate Finance has since set.
   */
  async seed(): Promise<void> {
    if (await CoinSettingsModel.exists(SINGLETON)) return;

    const [app, referral] = await Promise.all([
      AppSettingsModel.collection.findOne({ singleton_key: 'app' }),
      ReferralSettingsModel.collection.findOne({ singleton_key: 'referral' }),
    ]);
    // One legacy rate covered every payment, so both new rates start from it —
    // the split is a capability, not a change in what anyone is paid today.
    const legacyPct = cleanPct(app?.coin_earn_pct, 10);
    const legacyCoins = cleanCoins(referral?.coins_per_referral, 50);

    await CoinSettingsModel.create({
      ...SINGLETON,
      pod_join_earn_pct: legacyPct,
      shop_earn_pct: legacyPct,
      coins_per_referral: legacyCoins,
    });
    logs.server.info('coin', 'seedSettings', {
      msg: `Coin settings seeded from the previous rates (${legacyPct}%, ${legacyCoins} coins)`,
    });
  },
};
