import {
  EARN_SITES,
  WebsiteEarnSectionModel,
  type EarnSite,
  type IWebsiteEarnSection,
} from './websiteEarn.model';
import type { WebsiteEarnSectionInput } from './websiteEarn.validator';

/** What a site gets before anyone has saved its row: on, default copy and photos. */
const DEFAULTS = {
  enabled: true,
  position: 'AFTER_REELS',
  variant: 'WALL',
  accent: 'PRIMARY',
  eyebrow: '',
  heading: '',
  heading_muted: '',
  text: '',
  cta_label: '',
  cta_url: '',
  images: [] as string[],
  floating_enabled: true,
  floating_label: '',
} as const;

const toPublic = (site: EarnSite, doc: IWebsiteEarnSection | null) => ({
  site,
  enabled: doc?.enabled ?? DEFAULTS.enabled,
  position: doc?.position ?? DEFAULTS.position,
  variant: doc?.variant ?? DEFAULTS.variant,
  accent: doc?.accent ?? DEFAULTS.accent,
  eyebrow: doc?.eyebrow ?? DEFAULTS.eyebrow,
  heading: doc?.heading ?? DEFAULTS.heading,
  heading_muted: doc?.heading_muted ?? DEFAULTS.heading_muted,
  text: doc?.text ?? DEFAULTS.text,
  cta_label: doc?.cta_label ?? DEFAULTS.cta_label,
  cta_url: doc?.cta_url ?? DEFAULTS.cta_url,
  images: doc?.images ? [...doc.images] : [...DEFAULTS.images],
  floating_enabled: doc?.floating_enabled ?? DEFAULTS.floating_enabled,
  floating_label: doc?.floating_label ?? DEFAULTS.floating_label,
  updated_at: doc?.updated_at?.toISOString?.() ?? null,
});

export const websiteEarnService = {
  /** Every site, saved or not, in a fixed order — the portal shows one tab each. */
  async list() {
    const docs = await WebsiteEarnSectionModel.find({ site: { $in: EARN_SITES } });
    const bySite = new Map(docs.map((doc) => [doc.site, doc]));
    return EARN_SITES.map((site) => toPublic(site, bySite.get(site) ?? null));
  },

  /** One site's section as its home page draws it. Unsaved = the defaults. */
  async pub(site: EarnSite) {
    return toPublic(site, await WebsiteEarnSectionModel.findOne({ site }));
  },

  /** Upsert: the first save creates the row, later saves replace every field. */
  async save(input: WebsiteEarnSectionInput, actorId: string) {
    const { site, ...fields } = input;
    const doc = await WebsiteEarnSectionModel.findOneAndUpdate(
      { site },
      { $set: { ...fields, updated_by: actorId } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return toPublic(site, doc);
  },
};
