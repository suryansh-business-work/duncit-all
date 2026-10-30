import { SmartIncentiveSettingsModel, type ISmartIncentiveSettings } from './smartIncentive.model';
import {
  assertSmartIncentiveCeiling,
  assertSmartIncentiveDelay,
} from './smartIncentive.rules';

const SINGLETON = { singleton_key: 'smart_incentive' };

const settingsPub = (doc: ISmartIncentiveSettings) => ({
  enabled: doc.enabled,
  delay_seconds: doc.delay_seconds,
  max_discount_pct: doc.max_discount_pct,
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

export const smartIncentiveSettingsService = {
  /**
   * The singleton, created with schema defaults the first time it is asked
   * for. Read first: it sits under every pod page that offers the incentive
   * and every checkout of one, and an upsert there would be a write per read.
   */
  async get(): Promise<ISmartIncentiveSettings> {
    const existing = await SmartIncentiveSettingsModel.findOne(SINGLETON);
    if (existing) return existing;
    const doc = await SmartIncentiveSettingsModel.findOneAndUpdate(
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
   * Every field is optional; an omitted one is left alone. Out-of-range values
   * are refused rather than clamped, so the console never shows a number that
   * was quietly saved as a different one.
   */
  async update(input: {
    enabled?: boolean | null;
    delay_seconds?: number | null;
    max_discount_pct?: number | null;
  }) {
    const doc = await this.get();
    if (input.enabled != null) doc.enabled = !!input.enabled;
    if (input.delay_seconds != null) doc.delay_seconds = assertSmartIncentiveDelay(input.delay_seconds);
    if (input.max_discount_pct != null) {
      doc.max_discount_pct = assertSmartIncentiveCeiling(input.max_discount_pct);
    }
    await doc.save();
    return settingsPub(doc);
  },
};
