import { describe, expect, it } from 'vitest';
import {
  BLANK_POD_PRODUCT_CRITERIA,
  POD_PRODUCT_SORTS,
  clampPodProductQty,
  filterPodProducts,
  podProductActiveFilterCount,
  podProductBlurb,
  podProductBrands,
  podProductImage,
  podProductLineTotal,
  podProductRequestsTotal,
  podProductStock,
  type PodPickerProduct,
  type PodProductCriteria,
} from '../src/pod-product-picker';

/** A catalogue row, with only the fields under test set deliberately. */
const product = (over: Partial<PodPickerProduct> = {}): PodPickerProduct => ({
  id: 'p1',
  product_name: 'Yoga Mat',
  unit_cost: 500,
  available_count: 10,
  ...over,
});

const criteria = (over: Partial<PodProductCriteria> = {}): PodProductCriteria => ({
  ...BLANK_POD_PRODUCT_CRITERIA,
  ...over,
});

const ids = (rows: readonly PodPickerProduct[]) => rows.map((r) => r.id);

describe('POD_PRODUCT_SORTS', () => {
  it('offers the four sorts in render order, each naming its catalogue key', () => {
    expect(POD_PRODUCT_SORTS.map((s) => s.value)).toEqual(['NAME', 'PRICE_LOW', 'PRICE_HIGH', 'STOCK']);
    expect(POD_PRODUCT_SORTS.map((s) => s.labelKey)).toEqual([
      'podProduct.sortName',
      'podProduct.sortPriceLow',
      'podProduct.sortPriceHigh',
      'podProduct.sortStock',
    ]);
  });
});

describe('BLANK_POD_PRODUCT_CRITERIA', () => {
  it('is the "nothing filtered" state: no search, every brand, out-of-stock shown, sorted by name', () => {
    expect(BLANK_POD_PRODUCT_CRITERIA).toEqual({ search: '', brand: '', inStockOnly: false, sort: 'NAME' });
    expect(podProductActiveFilterCount(BLANK_POD_PRODUCT_CRITERIA)).toBe(0);
  });
});

describe('podProductActiveFilterCount', () => {
  it('counts each filter moved off its default once', () => {
    expect(podProductActiveFilterCount(criteria({ search: 'mat' }))).toBe(1);
    expect(podProductActiveFilterCount(criteria({ brand: 'Nike' }))).toBe(1);
    expect(podProductActiveFilterCount(criteria({ inStockOnly: true }))).toBe(1);
    expect(
      podProductActiveFilterCount(criteria({ search: 'mat', brand: 'Nike', inStockOnly: true, sort: 'STOCK' }))
    ).toBe(4);
  });

  // The sort always has SOME value, so its default must not light the badge.
  it('does not count the default NAME sort but does count any other sort', () => {
    expect(podProductActiveFilterCount(criteria({ sort: 'NAME' }))).toBe(0);
    expect(podProductActiveFilterCount(criteria({ sort: 'PRICE_LOW' }))).toBe(1);
    expect(podProductActiveFilterCount(criteria({ sort: 'PRICE_HIGH' }))).toBe(1);
  });

  it('ignores a search made only of whitespace', () => {
    expect(podProductActiveFilterCount(criteria({ search: '   ' }))).toBe(0);
  });
});

describe('podProductBrands', () => {
  // Locale-aware, so a lowercase brand files under its letter rather than after
  // every capitalised one (a code-unit sort would put 'adidas' after 'Puma').
  it('lists each brand once, alphabetically regardless of case', () => {
    const rows = [
      product({ id: 'a', brand_name: 'Nike' }),
      product({ id: 'b', brand_name: 'adidas' }),
      product({ id: 'c', brand_name: 'Nike' }),
      product({ id: 'd', brand_name: 'Puma' }),
    ];
    expect(podProductBrands(rows)).toEqual(['adidas', 'Nike', 'Puma']);
  });

  it('trims brands and merges copies that differ only in surrounding space', () => {
    expect(podProductBrands([product({ brand_name: ' Nike ' }), product({ brand_name: 'Nike' })])).toEqual([
      'Nike',
    ]);
  });

  it('skips rows with no brand or a blank one', () => {
    const rows = [
      product({ brand_name: null }),
      product({ brand_name: undefined }),
      product({ brand_name: '   ' }),
      product({ brand_name: 'Puma' }),
    ];
    expect(podProductBrands(rows)).toEqual(['Puma']);
  });

  it('is empty for an empty catalogue', () => {
    expect(podProductBrands([])).toEqual([]);
  });
});

describe('podProductStock', () => {
  it('reports the units left', () => {
    expect(podProductStock(product({ available_count: 7 }))).toBe(7);
  });

  // An over-sold row must not push a negative into the quantity clamp.
  it('never reports below zero', () => {
    expect(podProductStock(product({ available_count: -3 }))).toBe(0);
  });

  it('treats a missing product or a non-numeric count as no stock', () => {
    expect(podProductStock(null)).toBe(0);
    expect(podProductStock(undefined)).toBe(0);
    expect(podProductStock(product({ available_count: Number.NaN }))).toBe(0);
    expect(podProductStock(product({ available_count: undefined as unknown as number }))).toBe(0);
  });
});

describe('filterPodProducts', () => {
  const catalogue = [
    product({ id: 'mat', product_name: 'Yoga Mat', brand_name: 'Nike', sku: 'YM-01', unit_cost: 500, available_count: 10 }),
    product({ id: 'block', product_name: 'Block', brand_name: 'Adidas', sku: 'BL-02', unit_cost: 200, available_count: 0 }),
    product({ id: 'strap', product_name: 'Strap', brand_name: null, sku: null, unit_cost: 800, available_count: 3 }),
  ];

  it('returns the whole catalogue, by name, under blank criteria', () => {
    expect(ids(filterPodProducts(catalogue, criteria()))).toEqual(['block', 'strap', 'mat']);
  });

  it('does not mutate the caller’s catalogue', () => {
    const before = ids(catalogue);
    filterPodProducts(catalogue, criteria({ sort: 'PRICE_HIGH' }));
    expect(ids(catalogue)).toEqual(before);
  });

  describe('search', () => {
    it('matches the name, brand or SKU, case-insensitively', () => {
      expect(ids(filterPodProducts(catalogue, criteria({ search: 'yoga' })))).toEqual(['mat']);
      expect(ids(filterPodProducts(catalogue, criteria({ search: 'ADIDAS' })))).toEqual(['block']);
      expect(ids(filterPodProducts(catalogue, criteria({ search: 'bl-02' })))).toEqual(['block']);
    });

    it('ignores surrounding whitespace in the term', () => {
      expect(ids(filterPodProducts(catalogue, criteria({ search: '  strap  ' })))).toEqual(['strap']);
    });

    it('still matches a product that has no brand or SKU on its name', () => {
      expect(ids(filterPodProducts(catalogue, criteria({ search: 'strap' })))).toEqual(['strap']);
    });

    it('returns nothing when no product matches', () => {
      expect(filterPodProducts(catalogue, criteria({ search: 'kettlebell' }))).toEqual([]);
    });
  });

  describe('brand', () => {
    it('keeps only the chosen brand', () => {
      expect(ids(filterPodProducts(catalogue, criteria({ brand: 'Nike' })))).toEqual(['mat']);
    });

    it('drops brandless products when a brand is chosen', () => {
      expect(ids(filterPodProducts(catalogue, criteria({ brand: 'Adidas' })))).toEqual(['block']);
    });

    it('compares trimmed brand names on both sides', () => {
      const rows = [product({ id: 'x', brand_name: ' Nike ' })];
      expect(ids(filterPodProducts(rows, criteria({ brand: '  Nike ' })))).toEqual(['x']);
    });

    it('treats a blank brand as every brand', () => {
      expect(filterPodProducts(catalogue, criteria({ brand: '   ' }))).toHaveLength(3);
    });
  });

  describe('inStockOnly', () => {
    it('hides products with no units left', () => {
      expect(ids(filterPodProducts(catalogue, criteria({ inStockOnly: true })))).toEqual(['strap', 'mat']);
    });

    it('shows sold-out products when the toggle is off', () => {
      expect(ids(filterPodProducts(catalogue, criteria({ inStockOnly: false })))).toContain('block');
    });
  });

  describe('sort', () => {
    it('NAME orders alphabetically', () => {
      expect(ids(filterPodProducts(catalogue, criteria({ sort: 'NAME' })))).toEqual(['block', 'strap', 'mat']);
    });

    // A code-unit sort would put every capitalised name ahead of 'apple'.
    it('NAME orders regardless of case', () => {
      const rows = [
        product({ id: 'cherry', product_name: 'cherry' }),
        product({ id: 'apple', product_name: 'apple' }),
        product({ id: 'banana', product_name: 'Banana' }),
      ];
      expect(ids(filterPodProducts(rows, criteria({ sort: 'NAME' })))).toEqual(['apple', 'banana', 'cherry']);
    });

    it('PRICE_LOW orders cheapest first', () => {
      expect(ids(filterPodProducts(catalogue, criteria({ sort: 'PRICE_LOW' })))).toEqual(['block', 'mat', 'strap']);
    });

    it('PRICE_HIGH orders dearest first', () => {
      expect(ids(filterPodProducts(catalogue, criteria({ sort: 'PRICE_HIGH' })))).toEqual(['strap', 'mat', 'block']);
    });

    it('STOCK orders most units first, with sold-out last', () => {
      expect(ids(filterPodProducts(catalogue, criteria({ sort: 'STOCK' })))).toEqual(['mat', 'strap', 'block']);
    });

    // An over-sold row reads as 0 stock, so it sorts ALONGSIDE sold-out rows
    // rather than below them: the two tie, and a tie keeps catalogue order
    // (sort is stable), so whichever of the pair came first stays first. A
    // comparator reading the raw count would push 'neg' last both times.
    it('STOCK treats a negative count as zero', () => {
      const neg = product({ id: 'neg', available_count: -5 });
      const zero = product({ id: 'zero', available_count: 0 });
      const one = product({ id: 'one', available_count: 1 });
      expect(ids(filterPodProducts([neg, zero, one], criteria({ sort: 'STOCK' })))).toEqual(['one', 'neg', 'zero']);
      expect(ids(filterPodProducts([zero, neg, one], criteria({ sort: 'STOCK' })))).toEqual(['one', 'zero', 'neg']);
    });
  });

  it('combines search, brand and stock as AND', () => {
    const rows = [
      product({ id: 'a', product_name: 'Mat', brand_name: 'Nike', available_count: 0 }),
      product({ id: 'b', product_name: 'Mat', brand_name: 'Nike', available_count: 2 }),
      product({ id: 'c', product_name: 'Mat', brand_name: 'Puma', available_count: 2 }),
      product({ id: 'd', product_name: 'Strap', brand_name: 'Nike', available_count: 2 }),
    ];
    expect(ids(filterPodProducts(rows, criteria({ search: 'mat', brand: 'Nike', inStockOnly: true })))).toEqual(['b']);
  });
});

describe('clampPodProductQty', () => {
  it('keeps a quantity that fits the stock', () => {
    expect(clampPodProductQty(3, product({ available_count: 10 }))).toBe(3);
  });

  it('caps the quantity at the remaining stock', () => {
    expect(clampPodProductQty(12, product({ available_count: 10 }))).toBe(10);
  });

  it('never goes below one', () => {
    expect(clampPodProductQty(0, product({ available_count: 10 }))).toBe(1);
    expect(clampPodProductQty(-4, product({ available_count: 10 }))).toBe(1);
  });

  it('floors fractional input before clamping', () => {
    expect(clampPodProductQty(2.9, product({ available_count: 10 }))).toBe(2);
  });

  it('treats a non-numeric quantity as one', () => {
    expect(clampPodProductQty(Number.NaN, product({ available_count: 10 }))).toBe(1);
  });

  // A sold-out product still shows 1 in the stepper, never 0 — the add button
  // is what blocks it, via podProductStock. With no stock there is no ceiling
  // either (a 0 ceiling would force the field to 0).
  it('floors at one, with no ceiling, when the product has no stock', () => {
    expect(clampPodProductQty(0, product({ available_count: 0 }))).toBe(1);
    expect(clampPodProductQty(5, product({ available_count: 0 }))).toBe(5);
    expect(clampPodProductQty(5, product({ available_count: -2 }))).toBe(5);
  });

  it('leaves the ceiling open when there is no product to read stock from', () => {
    expect(clampPodProductQty(99, null)).toBe(99);
    expect(clampPodProductQty(0, null)).toBe(1);
  });
});

describe('podProductLineTotal', () => {
  it('multiplies unit cost by quantity', () => {
    expect(podProductLineTotal(product({ unit_cost: 250 }), 4)).toBe(1000);
  });

  it('is zero without a product', () => {
    expect(podProductLineTotal(null, 4)).toBe(0);
  });

  it('is zero for a non-numeric quantity', () => {
    expect(podProductLineTotal(product({ unit_cost: 250 }), Number.NaN)).toBe(0);
  });
});

describe('podProductRequestsTotal', () => {
  const catalogue = [product({ id: 'a', unit_cost: 100 }), product({ id: 'b', unit_cost: 250 })];

  it('sums every attached row against the catalogue price', () => {
    expect(
      podProductRequestsTotal(
        [
          { product_id: 'a', quantity: 2 },
          { product_id: 'b', quantity: 1 },
        ],
        catalogue
      )
    ).toBe(450);
  });

  // A product that left the catalogue must not break the total.
  it('prices a row whose product is no longer in the catalogue at zero', () => {
    expect(
      podProductRequestsTotal(
        [
          { product_id: 'a', quantity: 2 },
          { product_id: 'gone', quantity: 5 },
        ],
        catalogue
      )
    ).toBe(200);
  });

  // Either side may carry the id as a non-string (an ObjectId-like value), so
  // both are normalised — a catalogue of numeric ids must price string
  // requests, and a string catalogue must price numeric requests.
  it('matches ids regardless of whether they arrive as strings or ObjectId-like values', () => {
    const numericCatalogue = [product({ id: 42 as unknown as string, unit_cost: 10 })];
    expect(podProductRequestsTotal([{ product_id: '42', quantity: 3 }], numericCatalogue)).toBe(30);

    const stringCatalogue = [product({ id: '42', unit_cost: 10 })];
    expect(podProductRequestsTotal([{ product_id: 42 as unknown as string, quantity: 3 }], stringCatalogue)).toBe(
      30
    );
  });

  it('is zero with no rows', () => {
    expect(podProductRequestsTotal([], catalogue)).toBe(0);
  });
});

describe('podProductImage', () => {
  it('prefers the direct image_url', () => {
    expect(podProductImage(product({ image_url: ' https://cdn/x.png ', images: ['https://cdn/y.png'] }))).toBe(
      'https://cdn/x.png'
    );
  });

  it('falls back to the first usable entry in images when image_url is blank or missing', () => {
    expect(podProductImage(product({ image_url: '   ', images: ['https://cdn/y.png'] }))).toBe('https://cdn/y.png');
    expect(podProductImage(product({ image_url: null, images: [' https://cdn/z.png '] }))).toBe('https://cdn/z.png');
  });

  it('skips blank or null entries in images', () => {
    const images = ['', '   ', null, 'https://cdn/real.png'] as unknown as string[];
    expect(podProductImage(product({ images }))).toBe('https://cdn/real.png');
  });

  it('is null when the product ships no usable image', () => {
    expect(podProductImage(product({ image_url: null, images: null }))).toBeNull();
    expect(podProductImage(product({ images: ['', '  '] }))).toBeNull();
    expect(podProductImage(product())).toBeNull();
  });

  it('is null without a product', () => {
    expect(podProductImage(null)).toBeNull();
    expect(podProductImage(undefined)).toBeNull();
  });
});

describe('podProductBlurb', () => {
  it('shows the short description when the catalogue has one', () => {
    expect(podProductBlurb(product({ short_description: ' Grippy mat ', description: 'Long copy' }))).toBe(
      'Grippy mat'
    );
  });

  it('falls back to the long description when the short one is blank or missing', () => {
    expect(podProductBlurb(product({ short_description: '   ', description: ' Long copy ' }))).toBe('Long copy');
    expect(podProductBlurb(product({ short_description: null, description: 'Long copy' }))).toBe('Long copy');
  });

  it('is empty when neither description is set', () => {
    expect(podProductBlurb(product({ short_description: null, description: null }))).toBe('');
    expect(podProductBlurb(product({ short_description: '  ', description: '  ' }))).toBe('');
    expect(podProductBlurb(product())).toBe('');
  });

  it('is empty without a product', () => {
    expect(podProductBlurb(null)).toBe('');
    expect(podProductBlurb(undefined)).toBe('');
  });
});
