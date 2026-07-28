import { describe, expect, it } from 'vitest';
import { argumentsAt, fieldsAt, operationOf, variablesOf } from '../../../__tests__/gql-contract';
import {
  DELETE_LISTING,
  MY_PRODUCT_ANALYTICS,
  MY_PRODUCT_LISTINGS,
  MY_PRODUCT_LISTINGS_TABLE,
  UPDATE_PRODUCT_SETTINGS,
  UPDATE_QUANTITY,
  type ProductListingRow,
} from '../queries';

/** `satisfies` keeps this exhaustive — tsc fails if the row interface drifts. */
const PRODUCT_ROW_FIELDS = Object.keys({
  id: 0,
  product_name: 0,
  description: 0,
  image_url: 0,
  images: 0,
  size_label: 0,
  color: 0,
  inventory_count: 0,
  available_count: 0,
  low_stock_alert: 0,
  notify_low_stock: 0,
  unit_cost: 0,
  delivery_target: 0,
  listing_review_status: 0,
  updated_at: 0,
} satisfies Record<keyof ProductListingRow, number>);

describe('MY_PRODUCT_LISTINGS', () => {
  it('keeps brand_id optional so a single-brand partner can omit it', () => {
    expect(operationOf(MY_PRODUCT_LISTINGS)).toEqual({ name: 'MyProductListings', type: 'query' });
    expect(variablesOf(MY_PRODUCT_LISTINGS)).toEqual({ brand_id: 'ID' });
    expect(argumentsAt(MY_PRODUCT_LISTINGS, 'myProductListings')).toEqual({ brand_id: '$brand_id' });
  });

  it('returns the moderation verdict and its notes, which gate the edit CTA', () => {
    const product = fieldsAt(MY_PRODUCT_LISTINGS, 'myProductListings');
    expect(product).toContain('listing_review_status');
    expect(product).toContain('listing_review_notes');
  });

  it('separates catalogue stock from live availability', () => {
    const product = fieldsAt(MY_PRODUCT_LISTINGS, 'myProductListings');
    expect(product).toContain('inventory_count');
    expect(product).toContain('available_count');
  });

  it('returns the shipping dimensions and delivery settings the editor prefills', () => {
    expect(fieldsAt(MY_PRODUCT_LISTINGS, 'myProductListings')).toEqual(
      expect.arrayContaining([
        'height_cm',
        'weight_kg',
        'length_cm',
        'breadth_cm',
        'delivery_target',
        'pickup_location_id',
        'free_delivery_above',
        'commission_pct',
        'is_duncit_delivery_partner',
      ]),
    );
  });

  it('expands options, variants and the category cascade', () => {
    expect(fieldsAt(MY_PRODUCT_LISTINGS, 'myProductListings', 'options')).toEqual(['name', 'values']);
    expect(fieldsAt(MY_PRODUCT_LISTINGS, 'myProductListings', 'variants', 'option_values')).toEqual([
      'name',
      'value',
    ]);
    expect(fieldsAt(MY_PRODUCT_LISTINGS, 'myProductListings', 'categories')).toEqual([
      'super_category_id',
      'category_id',
      'sub_category_id',
      'super_category_name',
      'category_name',
      'sub_category_name',
    ]);
  });

  it('gives every variant its own price, stock, images and dimensions', () => {
    expect(fieldsAt(MY_PRODUCT_LISTINGS, 'myProductListings', 'variants')).toEqual(
      expect.arrayContaining([
        'option_label',
        'color',
        'size_label',
        'description',
        'unit_cost',
        'inventory_count',
        'images',
        'height_cm',
        'breadth_cm',
        'length_cm',
        'weight_kg',
      ]),
    );
  });
});

describe('MY_PRODUCT_LISTINGS_TABLE', () => {
  it('declares both the paging input and the brand_id the table passes as an extra', () => {
    expect(operationOf(MY_PRODUCT_LISTINGS_TABLE)).toEqual({
      name: 'MyProductListingsTable',
      type: 'query',
    });
    expect(variablesOf(MY_PRODUCT_LISTINGS_TABLE)).toEqual({
      brand_id: 'ID',
      query: 'TableQueryInput',
    });
  });

  it('exposes total and rows under the myProductListingsTable result key', () => {
    expect(fieldsAt(MY_PRODUCT_LISTINGS_TABLE)).toEqual(['myProductListingsTable']);
    expect(fieldsAt(MY_PRODUCT_LISTINGS_TABLE, 'myProductListingsTable')).toEqual(['total', 'rows']);
  });

  it('selects every ProductListingRow field on the paged rows', () => {
    const rows = fieldsAt(MY_PRODUCT_LISTINGS_TABLE, 'myProductListingsTable', 'rows');
    for (const field of PRODUCT_ROW_FIELDS) {
      expect(rows).toContain(field);
    }
  });

  it('returns the identical product shape as the unpaged list, so a row prefills the editor', () => {
    expect(fieldsAt(MY_PRODUCT_LISTINGS_TABLE, 'myProductListingsTable', 'rows')).toEqual(
      fieldsAt(MY_PRODUCT_LISTINGS, 'myProductListings'),
    );
  });
});

describe('UPDATE_QUANTITY', () => {
  it('takes the doc id and the new count, both required', () => {
    expect(operationOf(UPDATE_QUANTITY)).toEqual({
      name: 'UpdateMyProductListingQuantity',
      type: 'mutation',
    });
    expect(variablesOf(UPDATE_QUANTITY)).toEqual({
      product_doc_id: 'ID!',
      inventory_count: 'Int!',
    });
    expect(argumentsAt(UPDATE_QUANTITY, 'updateMyProductListingQuantity')).toEqual({
      product_doc_id: '$product_doc_id',
      inventory_count: '$inventory_count',
    });
  });

  it('returns the whole product so the edited row refreshes from the mutation result', () => {
    expect(fieldsAt(UPDATE_QUANTITY, 'updateMyProductListingQuantity')).toEqual(
      fieldsAt(MY_PRODUCT_LISTINGS, 'myProductListings'),
    );
  });
});

describe('DELETE_LISTING', () => {
  it('takes the doc id and resolves to a scalar', () => {
    expect(operationOf(DELETE_LISTING)).toEqual({
      name: 'DeleteMyProductListing',
      type: 'mutation',
    });
    expect(variablesOf(DELETE_LISTING)).toEqual({ product_doc_id: 'ID!' });
    expect(fieldsAt(DELETE_LISTING)).toEqual(['deleteMyProductListing']);
    expect(() => fieldsAt(DELETE_LISTING, 'deleteMyProductListing')).toThrow(/selects no sub-fields/);
  });
});

describe('MY_PRODUCT_ANALYTICS', () => {
  it('is scoped to one product by its required doc id', () => {
    expect(operationOf(MY_PRODUCT_ANALYTICS)).toEqual({ name: 'MyProductAnalytics', type: 'query' });
    expect(variablesOf(MY_PRODUCT_ANALYTICS)).toEqual({ product_doc_id: 'ID!' });
    expect(argumentsAt(MY_PRODUCT_ANALYTICS, 'myProductAnalytics')).toEqual({
      product_doc_id: '$product_doc_id',
    });
  });

  it('returns every metric tile the analytics panel renders, plus its currency symbol', () => {
    expect(fieldsAt(MY_PRODUCT_ANALYTICS, 'myProductAnalytics')).toEqual([
      'total_views',
      'total_clicks',
      'orders',
      'units_sold',
      'gross_revenue',
      'total_earning',
      'currency_symbol',
      'linked_pods',
      'locations',
      'variants',
    ]);
  });

  it('breaks sales down by purchase location and by variant', () => {
    expect(fieldsAt(MY_PRODUCT_ANALYTICS, 'myProductAnalytics', 'locations')).toEqual([
      'location',
      'units_sold',
      'orders',
    ]);
    expect(fieldsAt(MY_PRODUCT_ANALYTICS, 'myProductAnalytics', 'variants')).toEqual([
      'variant_id',
      'variant_label',
      'units_sold',
      'orders',
      'views',
      'clicks',
    ]);
  });

  it('tracks views and clicks per variant, not only at product level', () => {
    const perVariant = fieldsAt(MY_PRODUCT_ANALYTICS, 'myProductAnalytics', 'variants');
    expect(perVariant).toContain('views');
    expect(perVariant).toContain('clicks');
    expect(fieldsAt(MY_PRODUCT_ANALYTICS, 'myProductAnalytics', 'locations')).not.toContain('views');
  });
});

describe('UPDATE_PRODUCT_SETTINGS', () => {
  it('sends the threshold and the notify flag as required scalars', () => {
    expect(operationOf(UPDATE_PRODUCT_SETTINGS)).toEqual({
      name: 'UpdateMyProductSettings',
      type: 'mutation',
    });
    expect(variablesOf(UPDATE_PRODUCT_SETTINGS)).toEqual({
      product_doc_id: 'ID!',
      low_stock_alert: 'Int!',
      notify_low_stock: 'Boolean!',
    });
  });

  it('returns the whole product so the settings page re-reads its saved values', () => {
    const returned = fieldsAt(UPDATE_PRODUCT_SETTINGS, 'updateMyProductSettings');
    expect(returned).toEqual(fieldsAt(MY_PRODUCT_LISTINGS, 'myProductListings'));
    expect(returned).toContain('low_stock_alert');
    expect(returned).toContain('notify_low_stock');
  });
});
