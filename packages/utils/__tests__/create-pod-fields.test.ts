/**
 * What Create Pod's steps show — the What step's category tiles and when a
 * folded "More options" opens.
 */
import { describe, expect, it } from 'vitest';

import {
  DETAILS_EXTRA_FIELDS,
  MONEY_EXTRA_FIELDS,
  anyFieldFailed,
  categoriesForGroup,
  categoriesForSuper,
  categoryIconLookup,
  categoryTileGroup,
  categoryTileName,
  createPodCatalogRows,
  createPodCategoryLevels,
  createPodGrantedRows,
  createPodGroupOptions,
  createPodSuperOptions,
  detailsExtrasFilled,
  moneyExtrasFilled,
} from '../src/create-pod-fields';

const badminton = { super_category_id: 'you', category_id: 'sports', sub_category_id: 'bad', super_category_name: 'For You', category_name: 'Sports', sub_category_name: 'Badminton' };
const ball = { super_category_id: 'you', category_id: 'ball', sub_category_id: null, super_category_name: 'For You', category_name: 'Ball', sub_category_name: '' };
const grooming = { super_category_id: 'pet', category_id: 'groom', sub_category_id: 'dog', super_category_name: 'For Your Pet', category_name: 'Pet Grooming', sub_category_name: 'Dog Grooming' };
const bare = { super_category_id: null, category_id: null, sub_category_id: null, super_category_name: 'Misc', category_name: '', sub_category_name: '' };

describe('category tiles', () => {
  it('names a tile by its most specific level and labels it with the level above', () => {
    expect([categoryTileName(badminton), categoryTileGroup(badminton)]).toEqual(['Badminton', 'Sports']);
    expect([categoryTileName(ball), categoryTileGroup(ball)]).toEqual(['Ball', 'For You']);
    expect([categoryTileName(bare), categoryTileGroup(bare)]).toEqual(['Misc', 'Misc']);
    // A sub-category whose category name was never denormalised reads under its super.
    expect(categoryTileGroup({ ...badminton, category_name: '' })).toBe('For You');
  });

  it('lists each super-category once, in the order its categories come', () => {
    expect(createPodSuperOptions([badminton, grooming, ball])).toEqual([
      { id: 'you', name: 'For You' },
      { id: 'pet', name: 'For Your Pet' },
    ]);
    expect(createPodSuperOptions([bare])).toEqual([{ id: '', name: 'Misc' }]);
    expect(createPodSuperOptions([])).toEqual([]);
  });

  it("narrows to the picked super's tiles only when there are two to choose between", () => {
    expect(categoriesForSuper([badminton, grooming, ball], 2, 'pet')).toEqual([grooming]);
    expect(categoriesForSuper([badminton, ball], 1, 'pet')).toEqual([badminton, ball]);
  });

  it("finds a tile's own icon, else its parent category's, else none", () => {
    const iconOf = categoryIconLookup([
      { id: 'bad', icon: 'https://cdn/badminton.png' },
      { id: 'groom', icon: 'https://cdn/grooming.png' },
      { id: 'dog', icon: null },
      { id: 'ball', icon: '' },
    ]);
    expect(iconOf(badminton)).toBe('https://cdn/badminton.png');
    expect(iconOf(grooming)).toBe('https://cdn/grooming.png');
    expect(iconOf(ball)).toBe('');
    expect(iconOf(bare)).toBe('');
  });
});

describe('the three-level category picker', () => {
  const supers = [
    { id: 'you', name: 'For You', is_active: true },
    { id: 'pet', name: 'For Your Pet', is_active: true },
    { id: 'old', name: 'Retired', is_active: false },
  ];
  const categories = [
    { id: 'sports', name: 'Sports', parent_id: 'you', is_active: true },
    { id: 'creative', name: 'Creative', parent_id: 'you', is_active: true },
    { id: 'groom', name: 'Pet Grooming', parent_id: 'pet', is_active: true },
    { id: 'cultural', name: 'Cultural', parent_id: 'you', is_active: false },
    { id: 'relic', name: 'Relic', parent_id: 'old', is_active: true },
    // A category never filed under a super.
    { id: 'loose', name: 'Loose', parent_id: null, is_active: true },
  ];
  // Listed out of tree order on purpose: the rows follow Super, then Category, then Sub order.
  const subs = [
    { id: 'dog', name: 'Dog Grooming', parent_id: 'groom', is_active: true },
    { id: 'music', name: 'Music', parent_id: 'creative', is_active: true },
    { id: 'bad', name: 'Badminton', parent_id: 'sports', is_active: true },
    { id: 'cricket', name: 'Cricket', parent_id: 'sports', is_active: true },
    { id: 'polo', name: 'Polo', parent_id: 'sports', is_active: false },
    { id: 'dance', name: 'Dance', parent_id: 'cultural', is_active: true },
    { id: 'fossil', name: 'Fossil', parent_id: 'relic', is_active: true },
    { id: 'orphan', name: 'Orphan', parent_id: 'gone', is_active: true },
    { id: 'stray', name: 'Stray', parent_id: null, is_active: true },
    { id: 'unfiled', name: 'Unfiled', parent_id: 'loose', is_active: true },
  ];
  const catalog = createPodCatalogRows(supers, categories, subs);
  const keys = (rows: readonly { sub_category_id?: string | null }[]) => rows.map((row) => row.sub_category_id);

  it('builds one row per active sub whose whole parent chain is active, in tree order', () => {
    expect(keys(catalog)).toEqual(['bad', 'cricket', 'music', 'dog']);
    expect(catalog[0]).toEqual({
      super_category_id: 'you',
      category_id: 'sports',
      sub_category_id: 'bad',
      super_category_name: 'For You',
      category_name: 'Sports',
      sub_category_name: 'Badminton',
    });
    expect(createPodCatalogRows([], categories, subs)).toEqual([]);
  });

  it('opens a Sub, Category or Super grant to exactly the subs beneath it', () => {
    const grant = (super_category_id: string | null, category_id: string | null, sub_category_id: string | null) => ({
      super_category_id,
      category_id,
      sub_category_id,
      super_category_name: '',
      category_name: '',
      sub_category_name: '',
    });
    expect(keys(createPodGrantedRows(catalog, [grant('you', 'sports', 'bad')]))).toEqual(['bad']);
    expect(keys(createPodGrantedRows(catalog, [grant('you', 'sports', null)]))).toEqual(['bad', 'cricket']);
    expect(keys(createPodGrantedRows(catalog, [grant('you', null, null)]))).toEqual(['bad', 'cricket', 'music']);
    // Overlapping grants list a sub once; a grant naming a retired sub or no super opens nothing.
    expect(keys(createPodGrantedRows(catalog, [grant('you', 'sports', null), grant('you', 'sports', 'bad')]))).toEqual(['bad', 'cricket']);
    expect(createPodGrantedRows(catalog, [grant('you', 'sports', 'polo'), grant(null, 'sports', null)])).toEqual([]);
    expect(createPodGrantedRows(catalog, [])).toEqual([]);
    // With no catalog to expand against, the grants are listed as they are.
    expect(createPodGrantedRows([], [badminton, ball])).toEqual([badminton, ball]);
  });

  it('lists the categories of one super, each once', () => {
    expect(createPodGroupOptions(catalog, 'you')).toEqual([
      { id: 'sports', name: 'Sports' },
      { id: 'creative', name: 'Creative' },
    ]);
    expect(createPodGroupOptions(catalog, 'missing')).toEqual([]);
    expect(keys(categoriesForGroup(catalog, 'sports'))).toEqual(['bad', 'cricket']);
    // A Super-only grant (no catalog to expand it) carries no category: it still forms one group.
    const wholeSuper = { ...badminton, category_id: null, sub_category_id: null, category_name: 'For You' };
    expect(createPodGroupOptions([wholeSuper], 'you')).toEqual([{ id: '', name: 'For You' }]);
    expect(categoriesForGroup([wholeSuper, badminton], '')).toEqual([wholeSuper]);
  });

  it('resolves a pick to the subs shown, falling back to the first option of a level no longer offered', () => {
    const picked = createPodCategoryLevels(catalog, { superId: 'you', categoryId: 'creative' });
    expect([picked.superId, picked.categoryId, keys(picked.subs)]).toEqual(['you', 'creative', ['music']]);
    expect(picked.supers.map((option) => option.id)).toEqual(['you', 'pet']);

    const fresh = createPodCategoryLevels(catalog, { superId: '', categoryId: '' });
    expect([fresh.superId, fresh.categoryId, keys(fresh.subs)]).toEqual(['you', 'sports', ['bad', 'cricket']]);

    // A category from the other super is not kept when the super changes.
    const pet = createPodCategoryLevels(catalog, { superId: 'pet', categoryId: 'sports' });
    expect([pet.categoryId, keys(pet.subs)]).toEqual(['groom', ['dog']]);

    const none = createPodCategoryLevels([], { superId: 'you', categoryId: 'sports' });
    expect(none).toEqual({ supers: [], superId: '', groups: [], categoryId: '', subs: [] });
  });
});


describe('More options', () => {
  const money = { ticket_discount_enabled: false, smart_incentive_enabled: false, payment_terms: '', place_charges: [], product_requests: [] };
  const details = { pod_hashtag_text: '', pod_info: '', available_perks: [], reel_url: '' };

  it("opens Money's extras when any one of them is already set, and not for blank space", () => {
    expect(moneyExtrasFilled(money)).toBe(false);
    expect(moneyExtrasFilled({ ...money, payment_terms: '   ' })).toBe(false);
    expect(moneyExtrasFilled({ ...money, ticket_discount_enabled: true })).toBe(true);
    expect(moneyExtrasFilled({ ...money, smart_incentive_enabled: true })).toBe(true);
    expect(moneyExtrasFilled({ ...money, payment_terms: 'No refunds' })).toBe(true);
    expect(moneyExtrasFilled({ ...money, place_charges: [{}] })).toBe(true);
    expect(moneyExtrasFilled({ ...money, product_requests: [{}] })).toBe(true);
  });

  it("opens Details' extras when any one of them is already filled, and not for blank space", () => {
    expect(detailsExtrasFilled(details)).toBe(false);
    expect(detailsExtrasFilled({ ...details, pod_info: ' ' })).toBe(false);
    expect(detailsExtrasFilled({ ...details, pod_hashtag_text: '#run' })).toBe(true);
    expect(detailsExtrasFilled({ ...details, pod_info: 'Bring water' })).toBe(true);
    expect(detailsExtrasFilled({ ...details, available_perks: ['Tee'] })).toBe(true);
    expect(detailsExtrasFilled({ ...details, reel_url: 'https://cdn/reel.mp4' })).toBe(true);
  });

  it('holds a section open only while one of its own fields has an error', () => {
    expect(anyFieldFailed({ payment_terms: { message: 'Too long' } }, MONEY_EXTRA_FIELDS)).toBe(true);
    expect(anyFieldFailed({ pod_title: { message: 'Required' } }, MONEY_EXTRA_FIELDS)).toBe(false);
    expect(anyFieldFailed({ reel_url: { message: 'Not a video' } }, DETAILS_EXTRA_FIELDS)).toBe(true);
    expect(anyFieldFailed({}, DETAILS_EXTRA_FIELDS)).toBe(false);
  });
});
