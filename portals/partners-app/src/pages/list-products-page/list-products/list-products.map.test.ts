/**
 * The product listing form's mapper: server record in, form values out, and
 * back again as the input the server accepts.
 *
 * Four rules here have consequences a brand only discovers after they have
 * listed something.
 *
 *  - Regenerating the variant matrix must PRESERVE what has already been typed
 *    for a combination that STILL EXISTS — dropping one colour from a grid must
 *    not throw away the prices, weights and photos on the rows that remain. A
 *    combination that is genuinely new starts blank, because Size=S is not the
 *    same thing as Size=S + Colour=Red.
 *  - Blank is not zero. `free_delivery_above` unset means "no free-delivery
 *    offer", so it becomes null — coerced to 0 it means "everything ships free".
 *  - The delivery target is kept from the product on edit. Resetting it to the
 *    default silently converted PICKUP listings into ShipRocket ones.
 *  - Total stock is the SUM of the variants, not the first one's. The flat
 *    product fields exist for legacy readers, and backfilling them from the
 *    primary variant is fine — except for stock, where it would advertise a
 *    fraction of what the brand actually holds.
 */
import { EMPTY_CATEGORY } from '@duncit/category';
import { describe, expect, it } from 'vitest';

import {
  buildProductModerationInput,
  emptyValues,
  emptyVariant,
  generateVariants,
  productToValues,
  productViolationTarget,
  toSubmitInput,
} from './list-products.map';
import type { ProductListingValues, ProductVariantValues } from './list-products.types';

const variant = (over: Partial<ProductVariantValues> = {}): ProductVariantValues => ({
  ...emptyVariant,
  ...over,
});

const values = (over: Partial<ProductListingValues> = {}): ProductListingValues => ({
  ...emptyValues,
  categories: [
    {
      super_id: 'sup-1',
      super_name: 'Sports',
      category_id: 'cat-1',
      category_name: 'Racquet',
      sub_id: 'sub-1',
      sub_name: 'Badminton',
    },
  ],
  product_name: 'Club Shuttle Tube',
  variants: [variant({ option_label: 'Default', unit_cost: 450, inventory_count: 20 })],
  ...over,
});

describe('generateVariants', () => {
  const SIZE = { name: 'Size', values: ['S', 'M'] };
  const COLOUR = { name: 'Colour', values: ['Red', 'Blue'] };

  it('keeps a single default variant while there are no options', () => {
    expect(generateVariants([], [])).toEqual([{ ...emptyVariant }]);
  });

  it('keeps what has already been typed when there are still no options', () => {
    const typed = [variant({ unit_cost: 450 })];

    expect(generateVariants([], typed)).toBe(typed);
  });

  it('ignores an option with no name or no values — a half-filled row is not a dimension', () => {
    expect(generateVariants([{ name: '  ', values: ['S'] }], [])).toEqual([{ ...emptyVariant }]);
    expect(generateVariants([{ name: 'Size', values: [] }], [])).toEqual([{ ...emptyVariant }]);
  });

  it('builds one variant per combination, across every option', () => {
    const built = generateVariants([SIZE, COLOUR], []);

    expect(built).toHaveLength(4);
    expect(built.map((row) => row.option_label)).toEqual([
      'S / Red',
      'S / Blue',
      'M / Red',
      'M / Blue',
    ]);
  });

  it('preserves the detail already entered for a combination that survives', () => {
    const first = generateVariants([SIZE, COLOUR], []);
    const typed = first.map((row) =>
      row.option_label === 'S / Red' ? { ...row, unit_cost: 450, image_urls: ['a.jpg'] } : row,
    );

    // The brand drops a colour; every remaining combination is the same one it
    // was, so rebuilding the grid must not throw away what they already typed.
    const regenerated = generateVariants([SIZE, { name: 'Colour', values: ['Red'] }], typed);
    const kept = regenerated.find((row) => row.option_label === 'S / Red');

    expect(regenerated).toHaveLength(2);
    expect(kept?.unit_cost).toBe(450);
    expect(kept?.image_urls).toEqual(['a.jpg']);
  });

  it('starts a genuinely NEW combination blank, since nothing was typed for it', () => {
    const first = generateVariants([SIZE], []);
    const typed = first.map((row) => ({ ...row, unit_cost: 450 }));

    // Adding a dimension makes every combination new — Size=S is not the same
    // thing as Size=S + Colour=Red, and pretending otherwise would carry one
    // variant's price onto several.
    const regenerated = generateVariants([SIZE, COLOUR], typed);

    expect(regenerated.every((row) => row.unit_cost === '')).toBe(true);
  });

  it('labels the size from the option actually called Size, whatever its case', () => {
    const [row] = generateVariants([{ name: 'size', values: ['M'] }], []);

    expect(row?.size_label).toBe('M');
  });

  it('leaves the size label empty when no option is a size', () => {
    const [row] = generateVariants([COLOUR], []);

    expect(row?.size_label).toBe('');
  });
});

describe('productToValues', () => {
  it('opens a blank form when there is no product yet', () => {
    const blank = productToValues();

    expect(blank.product_name).toBe('');
    expect(blank.categories).toEqual([{ ...EMPTY_CATEGORY }]);
    expect(blank.variants).toEqual([{ ...emptyVariant }]);
  });

  it('reads a product that has real variants', () => {
    const form = productToValues({
      product_name: 'Club Shuttle Tube',
      variants: [
        {
          option_label: 'M / Red',
          option_values: [{ name: 'Size', value: 'M' }],
          color: '#FF0000',
          images: ['a.jpg'],
          unit_cost: 450,
          inventory_count: 20,
        },
      ],
    });

    expect(form.product_name).toBe('Club Shuttle Tube');
    expect(form.variants[0]).toMatchObject({
      option_label: 'M / Red',
      color: '#FF0000',
      image_urls: ['a.jpg'],
      unit_cost: 450,
    });
  });

  it('reads a legacy product whose single variant lived in the flat fields', () => {
    const form = productToValues({
      product_name: 'Old Listing',
      size_label: 'One size',
      color: '#00FF00',
      image_url: 'cover.jpg',
      images: ['cover.jpg', 'back.jpg'],
      unit_cost: 300,
    });

    expect(form.variants).toHaveLength(1);
    expect(form.variants[0]).toMatchObject({ option_label: 'One size', color: '#00FF00' });
    // The cover appears in both fields on a legacy record; it is one image.
    expect(form.variants[0]?.image_urls).toEqual(['cover.jpg', 'back.jpg']);
  });

  it('names a legacy variant Default when it had neither size nor colour', () => {
    const form = productToValues({ product_name: 'Old Listing' });

    expect(form.variants[0]?.option_label).toBe('Default');
  });

  it('reads the category list when the product has one', () => {
    const form = productToValues({
      categories: [
        {
          super_category_id: 'sup-1',
          super_category_name: 'Sports',
          category_id: 'cat-1',
          category_name: 'Racquet',
          sub_category_id: 'sub-1',
          sub_category_name: 'Badminton',
        },
      ],
    });

    expect(form.categories[0]).toMatchObject({ super_id: 'sup-1', sub_name: 'Badminton' });
  });

  it('falls back to the legacy category triple, names unknown', () => {
    const form = productToValues({
      super_category_id: 'sup-1',
      category_id: 'cat-1',
      sub_category_id: 'sub-1',
    });

    expect(form.categories[0]).toMatchObject({ super_id: 'sup-1', super_name: '' });
  });

  it('opens on a blank category when the product has none at all', () => {
    expect(productToValues({ product_name: 'X' }).categories).toEqual([{ ...EMPTY_CATEGORY }]);
  });

  it('keeps the product own delivery target — resetting it converts a PICKUP listing', () => {
    expect(productToValues({ delivery_target: 'PICKUP' }).delivery_target).toBe('PICKUP');
    expect(productToValues({ product_name: 'X' }).delivery_target).toBe('SHIPROCKET');
  });

  it('reads an unset free-delivery amount as blank, never as zero', () => {
    expect(productToValues({ free_delivery_above: null }).free_delivery_above).toBe('');
    expect(productToValues({ free_delivery_above: 999 }).free_delivery_above).toBe(999);
  });

  it('reads the options a product was built from, and none where it has none', () => {
    expect(productToValues({ options: [{ name: 'Size', values: ['S'] }] }).options).toEqual([
      { name: 'Size', values: ['S'] },
    ]);
    expect(productToValues({ product_name: 'X' }).options).toEqual([]);
  });
});

describe('buildProductModerationInput', () => {
  it('sends the product name and every variant label for screening', () => {
    const input = buildProductModerationInput(
      values({
        variants: [
          variant({ option_label: 'S', description: 'Small tube' }),
          variant({ option_label: 'M', description: 'Medium tube' }),
        ],
      })
    );

    expect(input.product_name).toBe('Club Shuttle Tube');
    expect(input.variants.map((row) => row.option_label)).toEqual(['S', 'M']);
  });

  it('sends each image once, however many variants share it', () => {
    const input = buildProductModerationInput(
      values({
        variants: [
          variant({ image_urls: ['cover.jpg', 'back.jpg'] }),
          variant({ image_urls: ['cover.jpg'] }),
        ],
      })
    );

    expect(input.image_urls).toEqual(['cover.jpg', 'back.jpg']);
  });
});

describe('productViolationTarget', () => {
  it('sends a rejected product name to the product step, focused on the field', () => {
    expect(productViolationTarget('product_name')).toEqual({ stepIndex: 1, path: 'product_name' });
  });

  it('sends a rejected variant field to the variants step, focused on that variant', () => {
    expect(productViolationTarget('variants.0.description')).toEqual({
      stepIndex: 2,
      path: 'variants.0.description',
    });
  });

  it('sends a generic description or image violation to the variants step with nothing to focus', () => {
    expect(productViolationTarget('description')).toEqual({ stepIndex: 2, path: null });
    expect(productViolationTarget('image')).toEqual({ stepIndex: 2, path: null });
  });

  it('sends anything it does not recognise back to the product step rather than nowhere', () => {
    expect(productViolationTarget('something_new')).toEqual({ stepIndex: 1, path: null });
  });
});

describe('toSubmitInput', () => {
  it('carries the brand and the category triple the server keys on', () => {
    const input = toSubmitInput(values(), 'brand-1');

    expect(input.brand_id).toBe('brand-1');
    expect(input).toMatchObject({
      super_category_id: 'sup-1',
      category_id: 'cat-1',
      sub_category_id: 'sub-1',
    });
  });

  it('backfills the flat product fields from the FIRST variant, for legacy readers', () => {
    const input = toSubmitInput(
      values({
        variants: [
          variant({ image_urls: ['cover.jpg'], description: 'Primary', color: '#FF0000', unit_cost: 450 }),
          variant({ image_urls: ['other.jpg'], description: 'Second' }),
        ],
      }),
      'brand-1'
    );

    expect(input).toMatchObject({
      image_url: 'cover.jpg',
      description: 'Primary',
      color: '#FF0000',
      unit_cost: 450,
    });
  });

  it('totals the stock across every variant, never just the first', () => {
    const input = toSubmitInput(
      values({
        variants: [
          variant({ inventory_count: 20 }),
          variant({ inventory_count: 5 }),
          variant({ inventory_count: '' }),
        ],
      }),
      'brand-1'
    );

    expect(input.inventory_count).toBe(25);
  });

  it('sends every measurement as a number, blanks becoming zero', () => {
    const input = toSubmitInput(
      values({ variants: [variant({ height_cm: '', weight_kg: 1.5, unit_cost: 'abc' })] }),
      'brand-1'
    );

    expect(input.height_cm).toBe(0);
    expect(input.weight_kg).toBe(1.5);
    expect(input.unit_cost).toBe(0);
  });

  it('drops half-filled options rather than sending a dimension with no values', () => {
    const input = toSubmitInput(
      values({
        options: [
          { name: 'Size', values: ['S', 'M'] },
          { name: '  ', values: ['X'] },
          { name: 'Colour', values: [] },
        ],
      }),
      'brand-1'
    );

    expect(input.options).toEqual([{ name: 'Size', values: ['S', 'M'] }]);
  });

  it('sends no free-delivery threshold as NULL — zero would ship everything free', () => {
    expect(toSubmitInput(values({ free_delivery_above: '' }), 'b').free_delivery_above).toBeNull();
    expect(toSubmitInput(values({ free_delivery_above: null as never }), 'b').free_delivery_above).toBeNull();
    expect(toSubmitInput(values({ free_delivery_above: 'abc' as never }), 'b').free_delivery_above).toBeNull();
  });

  it('sends a real threshold as the number it is', () => {
    expect(toSubmitInput(values({ free_delivery_above: 999 }), 'b').free_delivery_above).toBe(999);
  });

  it('sends every variant, with its option values intact', () => {
    const input = toSubmitInput(
      values({
        variants: [
          variant({ option_label: 'M / Red', option_values: [{ name: 'Size', value: 'M' }] }),
          variant({ option_label: 'S / Red' }),
        ],
      }),
      'brand-1'
    );

    expect(input.variants).toHaveLength(2);
    expect(input.variants[0]?.option_values).toEqual([{ name: 'Size', value: 'M' }]);
  });

  it('sends empty category ids for a listing nobody categorised', () => {
    const input = toSubmitInput(values({ categories: [{ ...EMPTY_CATEGORY }] }), 'brand-1');

    expect(input.super_category_id).toBe('');
  });
});
