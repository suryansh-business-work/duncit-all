import { useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import type { LinkOption } from '../../../components/form/RhfLinkField';
import { STORE_LINK_TARGETS, type StoreLinkTargetGroup } from '../queries';

/** The storefront's own routes — they exist whatever the catalogue holds. */
const STORE_PAGES: readonly { path: string; key: string }[] = [
  { path: '/', key: 'ecommPortal.homePage.linkHome' },
  { path: '/shop', key: 'ecommPortal.homePage.linkShop' },
  { path: '/deals', key: 'ecommPortal.homePage.linkDeals' },
  { path: '/brands', key: 'ecommPortal.homePage.linkBrands' },
  { path: '/wishlist', key: 'ecommPortal.homePage.linkWishlist' },
  { path: '/cart', key: 'ecommPortal.homePage.linkCart' },
  { path: '/track', key: 'ecommPortal.homePage.linkTrack' },
  { path: '/contact', key: 'ecommPortal.homePage.linkContact' },
  { path: '/autoship', key: 'ecommPortal.homePage.linkAutoship' },
  { path: '/pages/shipping', key: 'ecommPortal.homePage.linkShipping' },
  { path: '/pages/returns', key: 'ecommPortal.homePage.linkReturns' },
  { path: '/pages/terms', key: 'ecommPortal.homePage.linkTerms' },
  { path: '/pages/about', key: 'ecommPortal.homePage.linkAbout' },
];

/** The list heading each group of the catalogue's pages sits under. */
const GROUP_KEYS: Record<StoreLinkTargetGroup, string> = {
  PET_TYPE: 'ecommPortal.homePage.linkGroupPetTypes',
  CATEGORY: 'ecommPortal.homePage.linkGroupCategories',
  COLLECTION: 'ecommPortal.homePage.linkGroupCollections',
  BRAND: 'ecommPortal.homePage.linkGroupBrands',
  PAGE: 'ecommPortal.homePage.linkGroupPages',
};

/** Same order as the server sends within a group; the groups in the order the editor lists them. */
const GROUP_ORDER = Object.keys(GROUP_KEYS) as StoreLinkTargetGroup[];

/**
 * Every page a home tile can link to: the store's fixed pages, then each live
 * pet type, category, collection, brand and page. Fetched once and kept — the
 * picker opens on every row of the form.
 */
export function useLinkOptions(): readonly LinkOption[] {
  const { t } = useTranslation();
  const { data, error } = useQuery(STORE_LINK_TARGETS, { fetchPolicy: 'cache-first' });
  useEffect(() => {
    // The store's fixed pages and typed links still work; only the catalogue's pages are missing.
    if (error) logs.portal['ecomm-portal'].warn('home-page', 'useLinkOptions', { error });
  }, [error]);
  return useMemo(() => {
    const storeGroup = t('ecommPortal.homePage.linkGroupStore');
    const fixed = STORE_PAGES.map((page) => ({ group: storeGroup, label: t(page.key), path: page.path }));
    const targets = data?.storeAdminLinkTargets ?? [];
    const catalogue = GROUP_ORDER.flatMap((group) =>
      targets.filter((target) => target.group === group).map((target) => ({ group: t(GROUP_KEYS[group]), label: target.label, path: target.path })),
    );
    // One row per path: a page the store also builds in is listed once, under the store's pages.
    const byPath = new Map<string, LinkOption>();
    for (const option of [...fixed, ...catalogue]) {
      if (!byPath.has(option.path)) byPath.set(option.path, option);
    }
    return [...byPath.values()];
  }, [data, t]);
}
