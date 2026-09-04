import { flattenCatalogue, type NestedCatalogue } from './catalogue';
import { ADMIN_BUNDLE } from './bundles/admin';
import { ADS_BUNDLE } from './bundles/ads';
import { AI_BUNDLE } from './bundles/ai';
import { AI_MONITORING_BUNDLE } from './bundles/ai-monitoring';
import { CAPTCHA_BUNDLE } from './bundles/captcha';
import { CHALLENGE_BUNDLE } from './bundles/challenge';
import { CHANGE_REQUEST_BUNDLE } from './bundles/change-request';
import { CONTENT_REPORT_BUNDLE } from './bundles/content-report';
import { CRM_BUNDLE } from './bundles/crm';
import { DEVELOPERS_BUNDLE } from './bundles/developers';
import { EARNINGS_BUNDLE } from './bundles/earnings';
import { POD_TIMELINE_BUNDLE } from './bundles/pod-timeline';
import { FINANCE_BUNDLE } from './bundles/finance';
import { GRIEVANCE_BUNDLE } from './bundles/grievance';
import { LEGAL_BUNDLE } from './bundles/legal';
import { MAIL_PREFERENCE_BUNDLE } from './bundles/mail-preference';
import { MEDIA_BUNDLE } from './bundles/media';
import { AD_REQUEST_BUNDLE } from './bundles/ad-request';
import { UI_BUNDLE } from './bundles/ui';
import { VERIFICATION_BUNDLE } from './bundles/verification';
import { WITHDRAW_BUNDLE } from './bundles/withdraw';
import { AVAILABILITY_BUNDLE } from './bundles/availability';
import { VENUE_SETTINGS_BUNDLE } from './bundles/venue-settings';
import { CLUB_ADMIN_BUNDLE } from './bundles/club-admin';
import { FULFILMENT_BUNDLE } from './bundles/fulfilment';
import { SESSION_BUNDLE } from './bundles/session';
import { LOCATION_BUNDLE } from './bundles/location';
import { MWEB_BUNDLE } from './bundles/mweb';
import { PARTNERS_BUNDLE } from './bundles/partners';
import { POD_PRODUCT_BUNDLE } from './bundles/pod-product';
import { POLICY_ACCEPTANCE_BUNDLE } from './bundles/policy-acceptance';
import { PRODUCTS_BUNDLE } from './bundles/products';
import { SHELL_BUNDLE } from './bundles/shell';
import { STATUS_BUNDLE } from './bundles/status';
import { MARKETING_BUNDLE } from './bundles/marketing';
import { ONBOARDING_BUNDLE } from './bundles/onboarding';
import { POD_FORM_BUNDLE } from './bundles/pod-form';
import { CLUB_FORM_BUNDLE } from './bundles/club-form';
import { POD_DETAILS_BUNDLE } from './bundles/pod-details';
import { SUPPORT_BUNDLE } from './bundles/support';
import { TECH_BUNDLE } from './bundles/tech';
import { WEBSITE_BUNDLE } from './bundles/website';
import { WEBSITE_APP_BUNDLE } from './bundles/website-app';
import { WHATSAPP_BUNDLE } from './bundles/whatsapp';

/**
 * The SHIPPED FALLBACK CATALOGUE — every user-facing key the client surfaces
 * know about, in the same nested shape as the server's Localization entries
 * (CLAUDE.md rule 38).
 *
 * It lives in this package rather than in each surface for two reasons:
 *  - mWeb and native must be identical (rule 27), and two hand-kept copies of
 *    the same `mweb.*` copy is exactly how they drift apart;
 *  - the admin panel seeds Localization > Translations from this registry, so
 *    a key added here is offered for translation without anyone re-typing it.
 *
 * The copy itself is split one file per namespace under `./bundles/`, and this
 * module only assembles them. Localization work runs in parallel across many
 * surfaces, and a single file would make every contributor edit the same lines;
 * a namespace per file means a new `mweb.*` key and a new `shell.*` key never
 * touch each other. Adding a namespace means adding a file AND a line in
 * SURFACE_BUNDLES below — the registry is what the admin seeder reads.
 *
 * Each surface still SHIPS its bundle — it re-exports the slice it renders, so
 * the copy is compiled into that build and available offline.
 */
<<<<<<< Updated upstream
export {
  ADMIN_BUNDLE,
  ADS_BUNDLE,
  AI_BUNDLE,
  AI_MONITORING_BUNDLE,
  CAPTCHA_BUNDLE,
  AD_REQUEST_BUNDLE,
  CHALLENGE_BUNDLE,
  CONTENT_REPORT_BUNDLE,
  CRM_BUNDLE,
  CHANGE_REQUEST_BUNDLE,
  DEVELOPERS_BUNDLE,
  EARNINGS_BUNDLE,
  POD_TIMELINE_BUNDLE,
  FINANCE_BUNDLE,
  GRIEVANCE_BUNDLE,
  LEGAL_BUNDLE,
  MAIL_PREFERENCE_BUNDLE,
  MEDIA_BUNDLE,
  LOCATION_BUNDLE,
  MWEB_BUNDLE,
  PARTNERS_BUNDLE,
  POD_PRODUCT_BUNDLE,
  POLICY_ACCEPTANCE_BUNDLE,
  PRODUCTS_BUNDLE,
  SESSION_BUNDLE,
  SHELL_BUNDLE,
  STATUS_BUNDLE,
  MARKETING_BUNDLE,
  ONBOARDING_BUNDLE,
  POD_FORM_BUNDLE,
  CLUB_FORM_BUNDLE,
  POD_DETAILS_BUNDLE,
  SUPPORT_BUNDLE,
  TECH_BUNDLE,
  UI_BUNDLE,
  VERIFICATION_BUNDLE,
  WITHDRAW_BUNDLE,
  AVAILABILITY_BUNDLE,
  VENUE_SETTINGS_BUNDLE,
  CLUB_ADMIN_BUNDLE,
  FULFILMENT_BUNDLE,
  WEBSITE_APP_BUNDLE,
  WEBSITE_BUNDLE,
  WHATSAPP_BUNDLE,
=======

/** Copy shared by mWeb and the native app — one namespace, one source. */
export const MWEB_BUNDLE: NestedCatalogue = {
  mweb: {
    common: {
      language: 'Language',
      languageHint: 'Choose the language for the app.',
      languageSaved: 'Language updated',
    },
    account: {
      preferences: 'Preferences',
    },
    createPod: {
      step4: {
        noEarningsTitle: 'No Earnings Generated',
        noEarningsDescription:
          'Based on the current Ticket Price, your estimated earnings are ₹0 after applicable deductions. Please increase the Ticket Price to earn from this Pod.',
        venueShortfall:
          'Your venue price is greater than the total Pod value. Please increase the Ticket Price so that the total Pod value is equal to or greater than the Venue Price.',
        suggestedPriceLink: 'Suggested Price',
        suggestedPriceModalTitle: 'Suggested Ticket Prices',
        suggestedPriceColumn: 'Suggested Price',
        whatYouGetColumn: 'What You Get',
        close: 'Close',
        tierFirst: 'Most affordable option for attendees, with a small earning for you.',
        tierSecond: 'A balanced price point between affordability and your earnings.',
        tierThird: 'Better earnings while keeping the Pod accessible to attendees.',
        tierFourth: 'Premium pricing with strong earnings on every spot.',
        tierFifth: 'Best suited for high-value, exclusive Pod experiences.',
        recommendationNote:
          'We recommend choosing a price that balances affordability for attendees with meaningful earnings for you. Prices ending in ₹99 tend to perform best.',
      },
    },
    shop: {
      title: 'Pod Shop',
      emptyState: 'No products match your filters.',
      featured: 'Featured Products',
      outOfStock: 'Out of stock',
      includeOutOfStock: 'Include out of stock',
      searchPlaceholder: 'Search products or brands…',
    },
  },
};

/** Chrome rendered by the portal shell, shared by every MUI portal. */
export const SHELL_BUNDLE: NestedCatalogue = {
  mweb: {
    common: {
      language: 'Language',
      languageSaved: 'Language updated',
    },
  },
  shell: {
    profile: {
      accessRoles: 'ACCESS ROLES',
      noRoles: 'No roles assigned.',
      // NOT mweb.common.languageHint: the portal wording differs from the app's,
      // and the server stores ONE row per key — a second value for the same key
      // is unrepresentable, so whichever bundle merged last would silently
      // overwrite the other surface's copy.
      languageHint: 'Choose the language for this portal.',
    },
  },
};

/**
 * The marketing websites' own chrome. Navigation and footer LINK labels are
 * not here — those are content from the Website portal's Navigation manager,
 * and duplicating them as translation keys would give the same text two
 * owners.
 */
export const WEBSITE_BUNDLE: NestedCatalogue = {
  website: {
    footer: {
      newsletterTitle: 'Get Duncit updates',
      emailPlaceholder: 'Email address',
      notify: 'Notify',
      sending: 'Sending',
      subscribed: 'Subscribed!',
      tryAgain: 'Try again',
      policyHub: 'Policy Hub',
      allPolicies: 'All policies',
      rights: 'All Rights Reserved',
    },
    nav: {
      closeMenu: 'Close menu',
    },
  },
>>>>>>> Stashed changes
};

/** Every client bundle, by the surface that ships it. */
export const SURFACE_BUNDLES: Record<string, NestedCatalogue> = {
  admin: ADMIN_BUNDLE,
  ads: ADS_BUNDLE,
  ai: AI_BUNDLE,
  aiMonitoring: AI_MONITORING_BUNDLE,
  captcha: CAPTCHA_BUNDLE,
  challenge: CHALLENGE_BUNDLE,
  changeRequest: CHANGE_REQUEST_BUNDLE,
  contentReport: CONTENT_REPORT_BUNDLE,
  crm: CRM_BUNDLE,
  developers: DEVELOPERS_BUNDLE,
  earnings: EARNINGS_BUNDLE,
  podTimeline: POD_TIMELINE_BUNDLE,
  finance: FINANCE_BUNDLE,
  grievance: GRIEVANCE_BUNDLE,
  legal: LEGAL_BUNDLE,
  mailPreference: MAIL_PREFERENCE_BUNDLE,
  media: MEDIA_BUNDLE,
  adRequest: AD_REQUEST_BUNDLE,
  ui: UI_BUNDLE,
  verification: VERIFICATION_BUNDLE,
  withdraw: WITHDRAW_BUNDLE,
  availability: AVAILABILITY_BUNDLE,
  venueSettings: VENUE_SETTINGS_BUNDLE,
  clubAdmin: CLUB_ADMIN_BUNDLE,
  fulfilment: FULFILMENT_BUNDLE,
  session: SESSION_BUNDLE,
  location: LOCATION_BUNDLE,
  mweb: MWEB_BUNDLE,
  partners: PARTNERS_BUNDLE,
  podProduct: POD_PRODUCT_BUNDLE,
  policyAcceptance: POLICY_ACCEPTANCE_BUNDLE,
  products: PRODUCTS_BUNDLE,
  shell: SHELL_BUNDLE,
  status: STATUS_BUNDLE,
  marketing: MARKETING_BUNDLE,
  onboarding: ONBOARDING_BUNDLE,
  podForm: POD_FORM_BUNDLE,
  clubForm: CLUB_FORM_BUNDLE,
  podDetailsPanel: POD_DETAILS_BUNDLE,
  support: SUPPORT_BUNDLE,
  tech: TECH_BUNDLE,
  website: WEBSITE_BUNDLE,
  websiteApp: WEBSITE_APP_BUNDLE,
  whatsapp: WHATSAPP_BUNDLE,
};

/**
 * Every shipped key as flat `key -> default text`, deduplicated across
 * surfaces. The admin panel imports this to seed missing Translations rows.
 */
export function allFallbackEntries(): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const bundle of Object.values(SURFACE_BUNDLES)) {
    Object.assign(merged, flattenCatalogue(bundle));
  }
  return merged;
}
