import {
  clubCategoryKey,
  filterProductsForClub,
  productMatchesClub,
} from '@/utils/pod-product-category';

const SUPER = 'super-1';
const SUB = 'sub-1';
const club = { super_category_id: SUPER, category_id: SUB };

describe('clubCategoryKey', () => {
  it('returns null when the club is missing', () => {
    expect(clubCategoryKey(null)).toBeNull();
  });

  it('returns null when the club has no super or no sub', () => {
    expect(clubCategoryKey({})).toBeNull();
    expect(clubCategoryKey({ super_category_id: SUPER })).toBeNull();
    expect(clubCategoryKey({ category_id: SUB })).toBeNull();
  });

  it('returns the Super + Sub pair (club stores its Sub in category_id)', () => {
    expect(clubCategoryKey(club)).toEqual({ superId: SUPER, subId: SUB });
  });
});

describe('productMatchesClub', () => {
  const key = { superId: SUPER, subId: SUB };

  it('matches everything when there is no club key', () => {
    expect(productMatchesClub({ super_category_id: 'x', sub_category_id: 'y' }, null)).toBe(true);
  });

  it('matches a product that carries no category data at all', () => {
    expect(productMatchesClub({}, key)).toBe(true);
    expect(productMatchesClub({ categories: [] }, key)).toBe(true);
  });

  it('matches on any of the product category rows (ignoring rows missing ids)', () => {
    const product = {
      categories: [
        { super_category_id: 'other', sub_category_id: 'x' },
        { super_category_id: null, sub_category_id: SUB },
        { super_category_id: SUPER, sub_category_id: SUB },
      ],
    };
    expect(productMatchesClub(product, key)).toBe(true);
  });

  it('does not match when no category row shares the club Super + Sub', () => {
    const product = { categories: [{ super_category_id: SUPER, sub_category_id: 'other' }] };
    expect(productMatchesClub(product, key)).toBe(false);
  });

  it('falls back to the flat legacy fields when there are no category rows', () => {
    expect(productMatchesClub({ super_category_id: SUPER, sub_category_id: SUB }, key)).toBe(true);
    expect(productMatchesClub({ super_category_id: SUPER, sub_category_id: 'other' }, key)).toBe(
      false,
    );
  });
});

describe('filterProductsForClub', () => {
  const products = [
    { id: 'a', super_category_id: SUPER, sub_category_id: SUB },
    { id: 'b', super_category_id: SUPER, sub_category_id: 'other' },
    { id: 'c', categories: [{ super_category_id: SUPER, sub_category_id: SUB }] },
  ];

  it('returns all products when the club has no full Super + Sub', () => {
    expect(filterProductsForClub(products, {})).toBe(products);
  });

  it('keeps only the products matching the selected club', () => {
    expect(filterProductsForClub(products, club).map((p) => p.id)).toEqual(['a', 'c']);
  });
});
