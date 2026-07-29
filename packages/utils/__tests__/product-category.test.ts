import { describe, expect, it } from 'vitest';
import {
  clubCategoryKey,
  filterProductsForClub,
  productMatchesClub,
} from '../src/product-category';

const CLUB = { super_category_id: 'sup-1', category_id: 'sub-1' };
const KEY = { superId: 'sup-1', subId: 'sub-1' };

describe('clubCategoryKey', () => {
  it("reads the club's Super and its Sub (stored in category_id)", () => {
    expect(clubCategoryKey(CLUB)).toEqual(KEY);
  });

  it('coerces non-string ids (ObjectId) to strings', () => {
    const objectId = { toString: () => 'sup-9' };
    expect(clubCategoryKey({ super_category_id: objectId, category_id: 7 })).toEqual({
      superId: 'sup-9',
      subId: '7',
    });
  });

  it('returns null for a missing club', () => {
    expect(clubCategoryKey(null)).toBeNull();
    expect(clubCategoryKey(undefined)).toBeNull();
  });

  it('returns null for a legacy club missing either half of the pair', () => {
    expect(clubCategoryKey({ category_id: 'sub-1' })).toBeNull();
    expect(clubCategoryKey({ super_category_id: 'sup-1' })).toBeNull();
    expect(clubCategoryKey({ super_category_id: '', category_id: '' })).toBeNull();
  });
});

describe('productMatchesClub', () => {
  it('matches every product when the club has no category key', () => {
    expect(productMatchesClub({ super_category_id: 'other', sub_category_id: 'x' }, null)).toBe(
      true,
    );
  });

  it('matches a category row carrying the club Super + Sub', () => {
    const product = {
      categories: [
        { super_category_id: 'sup-0', sub_category_id: 'sub-0' },
        { super_category_id: 'sup-1', sub_category_id: 'sub-1' },
      ],
    };
    expect(productMatchesClub(product, KEY)).toBe(true);
  });

  it('rejects a product whose rows all belong to another category', () => {
    const product = { categories: [{ super_category_id: 'sup-2', sub_category_id: 'sub-2' }] };
    expect(productMatchesClub(product, KEY)).toBe(false);
  });

  it('rejects a partial row match — both Super and Sub must line up', () => {
    const sameSuper = { categories: [{ super_category_id: 'sup-1', sub_category_id: 'sub-2' }] };
    const sameSub = { categories: [{ super_category_id: 'sup-2', sub_category_id: 'sub-1' }] };
    expect(productMatchesClub(sameSuper, KEY)).toBe(false);
    expect(productMatchesClub(sameSub, KEY)).toBe(false);
  });

  it('ignores rows missing either id instead of throwing', () => {
    expect(productMatchesClub({ categories: [{ sub_category_id: 'sub-1' }] }, KEY)).toBe(false);
    expect(productMatchesClub({ categories: [{ super_category_id: 'sup-1' }] }, KEY)).toBe(false);
    expect(productMatchesClub({ categories: [null] }, KEY)).toBe(false);
  });

  it('falls back to the flat legacy fields when there are no category rows', () => {
    expect(productMatchesClub({ super_category_id: 'sup-1', sub_category_id: 'sub-1' }, KEY)).toBe(
      true,
    );
    expect(productMatchesClub({ super_category_id: 'sup-2', sub_category_id: 'sub-1' }, KEY)).toBe(
      false,
    );
  });

  it('prefers the rows array over the legacy fields when both exist', () => {
    const product = {
      super_category_id: 'sup-2',
      sub_category_id: 'sub-2',
      categories: [{ super_category_id: 'sup-1', sub_category_id: 'sub-1' }],
    };
    expect(productMatchesClub(product, KEY)).toBe(true);
  });

  // The picker used to show these, then the save rejected them with
  // "<product> does not belong to this pod's category" — pod.service grants no
  // such exemption. Hiding them is what keeps the client and the server aligned.
  it('rejects a product carrying no category data at all, exactly like the server', () => {
    expect(productMatchesClub({ name: 'Legacy tee' }, KEY)).toBe(false);
    expect(productMatchesClub({ categories: [] }, KEY)).toBe(false);
    expect(productMatchesClub({ categories: 'not-an-array' }, KEY)).toBe(false);
    expect(productMatchesClub(null, KEY)).toBe(false);
  });
});

describe('filterProductsForClub', () => {
  const matching = {
    id: 'p1',
    categories: [{ super_category_id: 'sup-1', sub_category_id: 'sub-1' }],
  };
  const other = {
    id: 'p2',
    categories: [{ super_category_id: 'sup-2', sub_category_id: 'sub-2' }],
  };
  const uncategorised = { id: 'p3' };

  it('keeps only products in the club category, dropping uncategorised ones', () => {
    expect(filterProductsForClub([matching, other, uncategorised], CLUB)).toEqual([matching]);
  });

  it('applies no filter when the club has no category pair', () => {
    const all = [matching, other];
    expect(filterProductsForClub(all, { super_category_id: 'sup-1' })).toBe(all);
    expect(filterProductsForClub(all, null)).toBe(all);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterProductsForClub([other], CLUB)).toEqual([]);
  });
});
