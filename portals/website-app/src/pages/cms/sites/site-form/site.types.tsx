import { z } from 'zod';
import type { CmsCollection, CmsSiteInput } from '@duncit/gql-types';
import type { CmsSiteRow } from '../../queries/sites';
import { CMS_COLLECTIONS } from '../../lib/labels';
import { domainList, httpsOrBlank, sitePath, slugField, splitList } from '../../lib/rules';
import { seoSharingSchema, toSeoSharingInput, toSeoSharingValues } from '../../lib/seoSharing';

type Translate = (key: string) => string;

const LEGACY_SITES = ['', 'MAIN', 'PARTNERS', 'ADS', 'EARNWITH'] as const;

const collectionRow = (t: Translate) =>
  z.object({
    collection: z.enum(CMS_COLLECTIONS),
    enabled: z.boolean(),
    path: sitePath(t('websiteApp.cms.site.errPath')),
  });

/** Built per render so every message follows the console's language. */
export const siteSchema = (t: Translate) =>
  z.object({
    key: slugField(t('websiteApp.cms.site.errKey')),
    name: z.string().trim().min(1, t('websiteApp.cms.site.errName')).max(120, t('websiteApp.cms.site.errName')),
    domains: domainList(t('websiteApp.cms.site.errDomain')),
    legacy_site: z.enum(LEGACY_SITES),
    is_active: z.boolean(),
    favicon_url: httpsOrBlank(t('websiteApp.cms.pageForm.errUrl')),
    seo_title: z.string().trim().max(160),
    seo_description: z.string().trim().max(320),
    seo_image: httpsOrBlank(t('websiteApp.cms.pageForm.errUrl')),
    seo_sharing: seoSharingSchema(t),
    header_fragment_id: z.string(),
    footer_fragment_id: z.string(),
    collections: z.array(collectionRow(t)),
  });

export type SiteFormValues = z.input<ReturnType<typeof siteSchema>>;
export type SiteFormOutput = z.output<ReturnType<typeof siteSchema>>;

const DEFAULT_PATHS: Record<CmsCollection, string> = {
  BLOG: '/blog',
  CAREER: '/careers',
  NEWSLETTER: '/newsletter',
  CASE_STUDY: '/case-studies',
  NEWSROOM: '/newsroom',
};

export function toSiteFormValues(site: CmsSiteRow | null): SiteFormValues {
  const paths = new Map(site?.collection_paths.map((row) => [row.collection, row.path]));
  return {
    key: site?.key ?? '',
    name: site?.name ?? '',
    domains: site?.domains.join(', ') ?? '',
    legacy_site: site?.legacy_site ?? '',
    is_active: site?.is_active ?? true,
    favicon_url: site?.favicon_url ?? '',
    seo_title: site?.seo.title ?? '',
    seo_description: site?.seo.description ?? '',
    seo_image: site?.seo.og_image_url ?? '',
    seo_sharing: toSeoSharingValues(site?.seo),
    header_fragment_id: site?.header_fragment_id ?? '',
    footer_fragment_id: site?.footer_fragment_id ?? '',
    collections: CMS_COLLECTIONS.map((collection) => ({
      collection,
      enabled: site?.collections.includes(collection) ?? false,
      path: paths.get(collection) ?? DEFAULT_PATHS[collection],
    })),
  };
}

export const toSiteInput = (values: SiteFormOutput): CmsSiteInput => ({
  key: values.key,
  name: values.name,
  domains: splitList(values.domains),
  legacy_site: values.legacy_site === '' ? null : values.legacy_site,
  is_active: values.is_active,
  favicon_url: values.favicon_url,
  seo: { title: values.seo_title, description: values.seo_description, og_image_url: values.seo_image, ...toSeoSharingInput(values.seo_sharing) },
  header_fragment_id: values.header_fragment_id || null,
  footer_fragment_id: values.footer_fragment_id || null,
  collections: values.collections.filter((row) => row.enabled).map((row) => row.collection),
  collection_paths: values.collections.map((row) => ({ collection: row.collection, path: row.path })),
});
