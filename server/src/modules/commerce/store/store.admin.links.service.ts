import { StoreCollectionModel } from './storeMerch.model';
import { StorePageModel } from './storePage.model';
import { StoreBrandModel, StoreCategoryModel, StorePetTypeModel } from './storeTaxonomy.model';

/** Which kind of storefront page a link target opens. */
export type StoreLinkTargetGroup = 'PET_TYPE' | 'CATEGORY' | 'COLLECTION' | 'BRAND' | 'PAGE';

export interface StoreLinkTarget {
  group: StoreLinkTargetGroup;
  label: string;
  path: string;
}

/** The storefront address of each page kind — the same shapes the store routes (website/ecomm-store lib/paths). */
const PATH_OF: Record<StoreLinkTargetGroup, (slug: string) => string> = {
  PET_TYPE: (slug) => `/pet/${encodeURIComponent(slug)}`,
  CATEGORY: (slug) => `/c/${encodeURIComponent(slug)}`,
  COLLECTION: (slug) => `/collections/${encodeURIComponent(slug)}`,
  BRAND: (slug) => `/brand/${encodeURIComponent(slug)}`,
  PAGE: (slug) => `/pages/${encodeURIComponent(slug)}`,
};

type Named = { name?: string; title?: string; slug: string };

const targetsOf = (group: StoreLinkTargetGroup, rows: Named[]): StoreLinkTarget[] =>
  rows.map((row) => ({ group, label: row.name ?? row.title ?? row.slug, path: PATH_OF[group](row.slug) }));

const ACTIVE = { is_active: true };
const ORDER = { sort_order: 1 as const, name: 1 as const };

/**
 * Every live page the operator's data makes on the storefront, for the link
 * pickers on home-page tiles and banners. The fixed pages (home, deals, cart…)
 * are the portal's to list — they need no lookup. One request, five lean reads
 * in parallel, names and slugs only.
 */
export async function storeLinkTargets(): Promise<StoreLinkTarget[]> {
  const [pets, categories, collections, brands, pages] = await Promise.all([
    StorePetTypeModel.find(ACTIVE).select('name slug').sort(ORDER).lean<Named[]>(),
    StoreCategoryModel.find(ACTIVE).select('name slug').sort(ORDER).lean<Named[]>(),
    StoreCollectionModel.find(ACTIVE).select('name slug').sort(ORDER).lean<Named[]>(),
    StoreBrandModel.find(ACTIVE).select('name slug').sort(ORDER).lean<Named[]>(),
    StorePageModel.find(ACTIVE).select('title slug').sort({ title: 1 }).lean<Named[]>(),
  ]);
  return [
    ...targetsOf('PET_TYPE', pets),
    ...targetsOf('CATEGORY', categories),
    ...targetsOf('COLLECTION', collections),
    ...targetsOf('BRAND', brands),
    ...targetsOf('PAGE', pages),
  ];
}
