import { flattenCatalogue, type NestedCatalogue } from './catalogue';
import { ADMIN_BUNDLE } from './bundles/admin';
import { ADS_BUNDLE } from './bundles/ads';
import { AI_BUNDLE } from './bundles/ai';
import { AI_MONITORING_BUNDLE } from './bundles/ai-monitoring';
import { CHALLENGE_BUNDLE } from './bundles/challenge';
import { CONTENT_REPORT_BUNDLE } from './bundles/content-report';
import { CRM_BUNDLE } from './bundles/crm';
import { DEVELOPERS_BUNDLE } from './bundles/developers';
import { FINANCE_BUNDLE } from './bundles/finance';
import { GRIEVANCE_BUNDLE } from './bundles/grievance';
import { LEGAL_BUNDLE } from './bundles/legal';
import { MAIL_PREFERENCE_BUNDLE } from './bundles/mail-preference';
import { MEDIA_BUNDLE } from './bundles/media';
import { MWEB_BUNDLE } from './bundles/mweb';
import { PARTNERS_BUNDLE } from './bundles/partners';
import { POD_PRODUCT_BUNDLE } from './bundles/pod-product';
import { POLICY_ACCEPTANCE_BUNDLE } from './bundles/policy-acceptance';
import { PRODUCTS_BUNDLE } from './bundles/products';
import { SHELL_BUNDLE } from './bundles/shell';
import { MARKETING_BUNDLE } from './bundles/marketing';
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
export {
  ADMIN_BUNDLE,
  ADS_BUNDLE,
  AI_BUNDLE,
  AI_MONITORING_BUNDLE,
  CHALLENGE_BUNDLE,
  CONTENT_REPORT_BUNDLE,
  CRM_BUNDLE,
  DEVELOPERS_BUNDLE,
  FINANCE_BUNDLE,
  GRIEVANCE_BUNDLE,
  LEGAL_BUNDLE,
  MAIL_PREFERENCE_BUNDLE,
  MEDIA_BUNDLE,
  MWEB_BUNDLE,
  PARTNERS_BUNDLE,
  POD_PRODUCT_BUNDLE,
  POLICY_ACCEPTANCE_BUNDLE,
  PRODUCTS_BUNDLE,
  SHELL_BUNDLE,
  MARKETING_BUNDLE,
  SUPPORT_BUNDLE,
  TECH_BUNDLE,
  WEBSITE_APP_BUNDLE,
  WEBSITE_BUNDLE,
  WHATSAPP_BUNDLE,
};

/** Every client bundle, by the surface that ships it. */
export const SURFACE_BUNDLES: Record<string, NestedCatalogue> = {
  admin: ADMIN_BUNDLE,
  ads: ADS_BUNDLE,
  ai: AI_BUNDLE,
  aiMonitoring: AI_MONITORING_BUNDLE,
  challenge: CHALLENGE_BUNDLE,
  contentReport: CONTENT_REPORT_BUNDLE,
  crm: CRM_BUNDLE,
  developers: DEVELOPERS_BUNDLE,
  finance: FINANCE_BUNDLE,
  grievance: GRIEVANCE_BUNDLE,
  legal: LEGAL_BUNDLE,
  mailPreference: MAIL_PREFERENCE_BUNDLE,
  media: MEDIA_BUNDLE,
  mweb: MWEB_BUNDLE,
  partners: PARTNERS_BUNDLE,
  podProduct: POD_PRODUCT_BUNDLE,
  policyAcceptance: POLICY_ACCEPTANCE_BUNDLE,
  products: PRODUCTS_BUNDLE,
  shell: SHELL_BUNDLE,
  marketing: MARKETING_BUNDLE,
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
