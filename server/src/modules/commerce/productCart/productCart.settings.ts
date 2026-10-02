import {
  CART_SETTINGS_BOUNDS,
  ProductCartSettingsModel,
  type IProductCartSettings,
} from './productCartSettings.model';

const SINGLETON = { singleton_key: 'product-cart' };

type BoundedKey = keyof typeof CART_SETTINGS_BOUNDS;

export interface ProductCartSettingsInput {
  nudge_enabled?: boolean | null;
  nudge_delay_minutes?: number | null;
  nudge_auto_hide_seconds?: number | null;
  email_enabled?: boolean | null;
  email_first_delay_hours?: number | null;
  email_repeat_hours?: number | null;
  email_max_count?: number | null;
}

/** A whole number inside the field's bounds; junk keeps the current value. */
const clampTo = (key: BoundedKey, value: unknown, current: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return current;
  const { min, max } = CART_SETTINGS_BOUNDS[key];
  return Math.min(max, Math.max(min, Math.floor(n)));
};

const BOUNDED_KEYS = Object.keys(CART_SETTINGS_BOUNDS) as BoundedKey[];

const toPublic = (doc: IProductCartSettings) => ({
  nudge_enabled: doc.nudge_enabled,
  nudge_delay_minutes: doc.nudge_delay_minutes,
  nudge_auto_hide_seconds: doc.nudge_auto_hide_seconds,
  email_enabled: doc.email_enabled,
  email_first_delay_hours: doc.email_first_delay_hours,
  email_repeat_hours: doc.email_repeat_hours,
  email_max_count: doc.email_max_count,
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

export const productCartSettingsService = {
  /** The singleton, created with defaults the first time it is asked for. Read
   * first — every app launch asks for it, and it exists from then on. */
  async get(): Promise<IProductCartSettings> {
    const existing = await ProductCartSettingsModel.findOne(SINGLETON);
    if (existing) return existing;
    const doc = await ProductCartSettingsModel.findOneAndUpdate(
      SINGLETON,
      { $setOnInsert: SINGLETON },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (!doc) throw new Error('Cart settings could not be created');
    return doc;
  },

  async pub() {
    return toPublic(await this.get());
  },

  async update(input: ProductCartSettingsInput, actorId: string) {
    const doc = await this.get();
    if (input.nudge_enabled != null) doc.nudge_enabled = Boolean(input.nudge_enabled);
    if (input.email_enabled != null) doc.email_enabled = Boolean(input.email_enabled);
    for (const key of BOUNDED_KEYS) {
      const value = input[key];
      if (value != null) doc[key] = clampTo(key, value, doc[key]);
    }
    doc.updated_by = actorId;
    await doc.save();
    return toPublic(doc);
  },
};
