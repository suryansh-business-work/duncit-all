import { toOptionalInt } from '../../../lib/format';
import { CATEGORY_KINDS, ITEM_KINDS } from '../section-kinds';
import { DEFAULT_PRODUCTS, tiersOf } from './home-section.rules';
import type { HomeSectionValues } from './home-section.types';

/** A carousel and a flash sale may name a collection; a slider does when that is its source. */
const collectionOf = (values: HomeSectionValues): string | null => {
  const uses =
    values.kind === 'COLLECTION_CAROUSEL' ||
    values.kind === 'FLASH_SALE' ||
    (values.kind === 'PRODUCT_SLIDER' && values.product_source === 'COLLECTION');
  return uses ? values.collection_id || null : null;
};

/** A category grid or icon row lists its picks; a category slider sends its one category. */
const categoriesOf = (values: HomeSectionValues): string[] => {
  if (CATEGORY_KINDS.has(values.kind)) return values.category_ids;
  if (values.kind === 'PRODUCT_SLIDER' && values.product_source === 'CATEGORY') return [values.slider_category_id];
  return [];
};

/** The server input: only the fields the chosen kind (and slider source) uses carry anything. */
export const toHomeSectionInput = (values: HomeSectionValues) => {
  const slider = values.kind === 'PRODUCT_SLIDER';
  return {
    kind: values.kind,
    title: values.title,
    subtitle: values.subtitle,
    is_active: values.is_active,
    starts_at: values.starts_at || null,
    ends_at: values.ends_at || null,
    items: ITEM_KINDS.has(values.kind) ? values.items : [],
    collection_id: collectionOf(values),
    category_ids: categoriesOf(values),
    product_limit: toOptionalInt(values.product_limit) ?? DEFAULT_PRODUCTS,
    discount_tiers: values.kind === 'FLASH_SALE' ? tiersOf(values.discount_tiers) : [],
    product_source: slider ? values.product_source : undefined,
    product_ids: slider && values.product_source === 'MANUAL' ? values.product_ids : [],
  };
};
