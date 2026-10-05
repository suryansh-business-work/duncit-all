import {
  REEL_SETTINGS_BOUNDS,
  WebsiteReelSettingsModel,
  type IWebsiteReelSettings,
} from './websiteReelSettings.model';

const SINGLETON = { singleton_key: 'website-reel-slider' };

type BoundedKey = keyof typeof REEL_SETTINGS_BOUNDS;

const BOUNDED_KEYS = Object.keys(REEL_SETTINGS_BOUNDS) as BoundedKey[];

export interface WebsiteReelSettingsInput {
  max_reel_mb?: number | null;
  max_reels?: number | null;
}

/** A whole number inside the field's bounds; junk keeps the current value. */
const clampTo = (key: BoundedKey, value: unknown, current: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return current;
  const { min, max } = REEL_SETTINGS_BOUNDS[key];
  return Math.min(max, Math.max(min, Math.floor(n)));
};

const toPublic = (doc: IWebsiteReelSettings) => ({
  max_reel_mb: doc.max_reel_mb,
  max_reels: doc.max_reels,
  updated_at: doc.updated_at?.toISOString?.() ?? '',
});

export const websiteReelSettingsService = {
  /** The singleton, created with defaults the first time it is asked for. */
  async get(): Promise<IWebsiteReelSettings> {
    const existing = await WebsiteReelSettingsModel.findOne(SINGLETON);
    if (existing) return existing;
    const doc = await WebsiteReelSettingsModel.findOneAndUpdate(
      SINGLETON,
      { $setOnInsert: SINGLETON },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (!doc) throw new Error('Reel slider settings could not be created');
    return doc;
  },

  async pub() {
    return toPublic(await this.get());
  },

  async update(input: WebsiteReelSettingsInput, actorId: string) {
    const doc = await this.get();
    for (const key of BOUNDED_KEYS) {
      const value = input[key];
      if (value != null) doc[key] = clampTo(key, value, doc[key]);
    }
    doc.updated_by = actorId;
    await doc.save();
    return toPublic(doc);
  },
};
