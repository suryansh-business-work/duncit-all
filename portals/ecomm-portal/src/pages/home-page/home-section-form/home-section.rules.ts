import { splitLines } from '../../../lib/format';
import type { ProductSource, SectionKind } from '../queries';

/** The store shows 1–48 products in a carousel or slider, 12 unless told otherwise. */
export const MAX_PRODUCTS = 48;
export const DEFAULT_PRODUCTS = 12;
/** A flash sale's discount steps are whole percentages in this range. */
export const TIER_MIN = 1;
export const TIER_MAX = 90;

export const tiersOf = (text: string): number[] => splitLines(text).map(Number);

export const validTiers = (text: string): boolean =>
  tiersOf(text).every((tier) => Number.isInteger(tier) && tier >= TIER_MIN && tier <= TIER_MAX);

/** The fields the cross-field rules read. */
export interface SectionShape {
  kind: SectionKind;
  collection_id: string;
  slider_category_id: string;
  product_source: ProductSource;
  product_ids: string[];
  discount_tiers: string;
  starts_at: string;
  ends_at: string;
}

/** A rule the section breaks: the field to flag and the message key. */
export interface SectionIssue {
  path: keyof SectionShape;
  key: string;
}

/** What a product slider is missing for the source it draws from. */
function sliderIssue(values: SectionShape): SectionIssue | null {
  if (values.kind !== 'PRODUCT_SLIDER') return null;
  if (values.product_source === 'COLLECTION' && !values.collection_id) {
    return { path: 'collection_id', key: 'ecommPortal.homePage.collectionRequired' };
  }
  if (values.product_source === 'CATEGORY' && !values.slider_category_id) {
    return { path: 'slider_category_id', key: 'ecommPortal.homePage.categoryRequired' };
  }
  if (values.product_source === 'MANUAL' && values.product_ids.length === 0) {
    return { path: 'product_ids', key: 'ecommPortal.homePage.productsRequired' };
  }
  return null;
}

/** Every rule the section breaks that no single field can check on its own. */
export function findIssues(values: SectionShape): SectionIssue[] {
  const issues: SectionIssue[] = [];
  if (values.kind === 'COLLECTION_CAROUSEL' && !values.collection_id) {
    issues.push({ path: 'collection_id', key: 'ecommPortal.homePage.collectionRequired' });
  }
  const slider = sliderIssue(values);
  if (slider) issues.push(slider);
  if (values.kind === 'FLASH_SALE' && !values.ends_at) {
    issues.push({ path: 'ends_at', key: 'ecommPortal.homePage.saleEndRequired' });
  }
  if (values.kind === 'FLASH_SALE' && tiersOf(values.discount_tiers).length === 0) {
    issues.push({ path: 'discount_tiers', key: 'ecommPortal.homePage.tiersRequired' });
  }
  if (values.starts_at && values.ends_at && values.ends_at <= values.starts_at) {
    issues.push({ path: 'ends_at', key: 'ecommPortal.homePage.endsAfterStart' });
  }
  return issues;
}
