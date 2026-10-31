import { logs } from '@observability/log';
import { localizationService } from '@modules/platform/localization/localization.service';
import { TranslationModel } from '@modules/platform/localization/localization.model';
import { SHIPPED_CLIENT_KEYS } from '@modules/platform/localization/shipped-keys';

/**
 * The words the server prints on a banner and in a template caption.
 *
 * Server-first, like every other surface: the text an operator set in
 * Localization for the default language wins, and the shipped English in the
 * marketing bundle (packages/i18n, carried to the server as SHIPPED_CLIENT_KEYS)
 * is the fallback. A store that cannot be read never blocks a banner.
 */
export const COPY_KEYS = {
  kicker: 'marketing.podPromo.banner.kicker',
  kickerSoon: 'marketing.podPromo.banner.kickerSoon',
  cta: 'marketing.podPromo.banner.cta',
  free: 'marketing.podPromo.banner.free',
  priceSolo: 'marketing.podPromo.banner.priceSolo',
  priceTier: 'marketing.podPromo.banner.priceTier',
  timeRange: 'marketing.podPromo.banner.timeRange',
  aboutHeading: 'marketing.podPromo.banner.aboutHeading',
  includedHeading: 'marketing.podPromo.banner.includedHeading',
  hostHeading: 'marketing.podPromo.banner.hostHeading',
  hostedBy: 'marketing.podPromo.banner.hostedBy',
  venueHeading: 'marketing.podPromo.banner.venueHeading',
  bookHeading: 'marketing.podPromo.banner.bookHeading',
  entryFee: 'marketing.podPromo.banner.entryFee',
  scarcity: 'marketing.podPromo.banner.scarcity',
  scanToBook: 'marketing.podPromo.banner.scanToBook',
  caption: 'marketing.podPromo.caption.template',
  captionLink: 'marketing.podPromo.caption.link',
} as const;

export type CopyKey = keyof typeof COPY_KEYS;
export type Copy = (key: CopyKey, vars?: Record<string, string | number>) => string;

const TTL_MS = 5 * 60_000;
let cache: { at: number; values: Map<string, string> } | null = null;

/** `{name}` placeholders filled from vars; an unknown one is left as it is. */
export function fill(template: string, vars: Record<string, string | number> = {}): string {
  return template.replaceAll(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

async function serverValues(): Promise<Map<string, string>> {
  const code = await localizationService.defaultLocaleCode();
  if (!code) return new Map();
  const docs = await TranslationModel.find({ key: { $in: Object.values(COPY_KEYS) } })
    .select('key values')
    .lean<{ key: string; values?: Record<string, string> }[]>();
  return new Map(docs.map((doc) => [doc.key, (doc.values?.[code] ?? '').trim()] as const).filter(([, value]) => value !== ''));
}

/** The copy function, server text first and the shipped English after it. */
export async function loadCopy(): Promise<Copy> {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    let values = new Map<string, string>();
    try {
      values = await serverValues();
    } catch (error) {
      logs.server.warn('pod-promo', 'loadCopy', { error, msg: 'localization unreadable; using the shipped copy' });
    }
    cache = { at: Date.now(), values };
  }
  const values = cache.values;
  return (key, vars) => {
    const full = COPY_KEYS[key];
    return fill(values.get(full) ?? SHIPPED_CLIENT_KEYS[full] ?? '', vars);
  };
}
