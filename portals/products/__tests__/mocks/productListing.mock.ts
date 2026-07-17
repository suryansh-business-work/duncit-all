import type { MockedResponse } from '@apollo/client/testing';
import { REVIEW_PRODUCT_LISTING, type ProductListingRow } from '../../src/pages/ecomm/requestsQueries';
import { makeInventoryProduct } from './inventory.mock';

/**
 * The review dialog defensively reads a possibly-null `commission_pct` /
 * `listing_review_notes` (`?? ''`), so the factory override widens exactly those
 * two fields to allow `null` — the single controlled assertion needed to model
 * the app's runtime tolerance without leaking `any` into the specs.
 */
type ProductListingRowOverride = Partial<
  Omit<ProductListingRow, 'commission_pct' | 'listing_review_notes'>
> & {
  commission_pct?: number | null;
  listing_review_notes?: string | null;
};

export const makeProductListingRow = (
  over: ProductListingRowOverride = {},
): ProductListingRow => {
  const p = makeInventoryProduct();
  const base: ProductListingRow = {
    id: 'r1',
    product_name: 'Mug',
    image_url: p.image_url,
    description: p.description,
    inventory_count: 30,
    unit_cost: 200,
    commission_pct: 15,
    delivery_target: p.delivery_target,
    listing_review_status: p.listing_review_status,
    listing_review_notes: 'note',
    listing_submitted_by_name: 'Ravi',
    is_duncit_delivery_partner: true,
    size_label: 'L',
    height_cm: p.height_cm,
    weight_kg: p.weight_kg,
    color: 'Blue',
    created_at: p.created_at,
  };
  return { ...base, ...over } as ProductListingRow;
};

export const reviewProductListingMock = (
  over: { status?: 'APPROVED' | 'DENIED'; fail?: boolean } = {},
): MockedResponse => ({
  request: { query: REVIEW_PRODUCT_LISTING },
  variableMatcher: () => true,
  result: over.fail
    ? { errors: [{ message: 'cannot review' }] }
    : {
        data: {
          reviewProductListing: {
            __typename: 'InventoryProduct',
            id: 'r1',
            listing_review_status: over.status ?? 'APPROVED',
            listing_review_notes: 'note',
            commission_pct: 15,
            status: 'ACTIVE',
            is_active: true,
          },
        },
      },
  maxUsageCount: 20,
});
