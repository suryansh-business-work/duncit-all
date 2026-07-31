import { utmSlug } from './shortLink.codes';
import {
  SHORT_LINK_MEDIUMS,
  SHORT_LINK_SOURCES,
  type ShortLinkMedium,
  type ShortLinkSource,
} from './shortLink.model';

/**
 * The human labels behind the stored enums. The utm value of each option is
 * derived from its label rather than typed out a second time, so a label and
 * its analytics value can never disagree.
 *
 * The portal renders its dropdowns from `shortLinkOptions`, not from a copy of
 * this list — one source of truth, and adding a channel is a server change
 * only.
 */
const SOURCE_LABELS: Record<ShortLinkSource, string> = {
  DIRECT_LINK_SHARE: 'Direct Link Share',
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
  THREADS: 'Threads',
  WHATSAPP: 'WhatsApp',
  X_TWITTER: 'X (Twitter)',
  LINKEDIN: 'LinkedIn',
  YOUTUBE: 'YouTube',
  TELEGRAM: 'Telegram',
  EMAIL: 'Email',
  SMS: 'SMS',
  GOOGLE_SEARCH: 'Google Search',
  GOOGLE_ADS: 'Google Ads',
  QR_CODE: 'QR Code',
  REDDIT: 'Reddit',
  DISCORD: 'Discord',
  INFLUENCER: 'Influencer',
  AFFILIATE: 'Affiliate',
  REFERRAL_PARTNER: 'Referral Partner',
  OTHER: 'Other',
};

const MEDIUM_LABELS: Record<ShortLinkMedium, string> = {
  SOCIAL: 'Social',
  ORGANIC_SOCIAL: 'Organic Social',
  PAID_SOCIAL: 'Paid Social',
  EMAIL: 'Email',
  MESSAGING: 'Messaging',
  CPC: 'CPC',
  DISPLAY: 'Display',
  SEARCH: 'Search',
  ORGANIC_SEARCH: 'Organic Search',
  REFERRAL: 'Referral',
  AFFILIATE: 'Affiliate',
  INFLUENCER: 'Influencer',
  QR_CODE: 'QR Code',
  PUSH_NOTIFICATION: 'Push Notification',
  SMS: 'SMS',
  BANNER: 'Banner',
  VIDEO: 'Video',
  DISPLAY_AD: 'Display Ad',
  IN_APP: 'In-App',
  DIRECT: 'Direct',
  OTHER: 'Other',
};

export interface ShortLinkOption {
  value: string;
  label: string;
  /** What this option puts in the URL. Empty for OTHER, which is free text. */
  utm_value: string;
  /** OTHER needs the marketer to say what they meant. */
  requires_text: boolean;
}

const toOptions = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({
    value,
    label: labels[value],
    utm_value: value === 'OTHER' ? '' : utmSlug(labels[value]),
    requires_text: value === 'OTHER',
  }));

export const shortLinkOptions = () => ({
  sources: toOptions(SHORT_LINK_SOURCES, SOURCE_LABELS),
  mediums: toOptions(SHORT_LINK_MEDIUMS, MEDIUM_LABELS),
});

/** The utm value a stored source/medium resolves to, with OTHER falling back
 * to the free text the marketer supplied. */
export const sourceUtm = (source: ShortLinkSource, other?: string | null) =>
  source === 'OTHER' ? utmSlug(other ?? '') : utmSlug(SOURCE_LABELS[source]);

export const mediumUtm = (medium: ShortLinkMedium, other?: string | null) =>
  medium === 'OTHER' ? utmSlug(other ?? '') : utmSlug(MEDIUM_LABELS[medium]);
