import { useMemo } from 'react';
import { useTranslation } from '@duncit/shell';
import type { CmsCollection, CmsFragmentKind, CmsPageKind } from '@duncit/gql-types';

/** Every collection, in the order the workspace tabs show them. */
export const CMS_COLLECTIONS = ['BLOG', 'CAREER', 'NEWSLETTER', 'CASE_STUDY', 'NEWSROOM'] as const satisfies readonly CmsCollection[];

/** URL slug per collection — `case-studies` in the tab param reads better than the enum. */
export const COLLECTION_SLUG: Record<CmsCollection, string> = {
  BLOG: 'blog',
  CAREER: 'careers',
  NEWSLETTER: 'newsletter',
  CASE_STUDY: 'case-studies',
  NEWSROOM: 'newsroom',
};

/**
 * Display names for the CMS enums. One literal t() per value on purpose: the
 * translation-key gate only sees keys written out in full.
 */
export function useCmsLabels() {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      collection: {
        BLOG: t('websiteApp.cms.collection.blog'),
        CAREER: t('websiteApp.cms.collection.career'),
        NEWSLETTER: t('websiteApp.cms.collection.newsletter'),
        CASE_STUDY: t('websiteApp.cms.collection.caseStudy'),
        NEWSROOM: t('websiteApp.cms.collection.newsroom'),
      } satisfies Record<CmsCollection, string>,
      pageKind: {
        PAGE: t('websiteApp.cms.pages.kindPage'),
        COLLECTION_LIST: t('websiteApp.cms.pages.kindList'),
        COLLECTION_DETAIL: t('websiteApp.cms.pages.kindDetail'),
      } satisfies Record<CmsPageKind, string>,
      liveComponent: t('websiteApp.cms.fragments.kindLive'),
      fragmentKind: {
        HEADER: t('websiteApp.cms.fragments.kindHeader'),
        FOOTER: t('websiteApp.cms.fragments.kindFooter'),
        SECTION: t('websiteApp.cms.fragments.kindSection'),
      } satisfies Record<CmsFragmentKind, string>,
    }),
    [t],
  );
}
