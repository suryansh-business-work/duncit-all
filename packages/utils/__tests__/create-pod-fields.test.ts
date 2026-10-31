/**
 * What Create Pod's steps show — the What step's category tiles and when a
 * folded "More options" opens.
 */
import { describe, expect, it } from 'vitest';

import {
  DETAILS_EXTRA_FIELDS,
  MONEY_EXTRA_FIELDS,
  anyFieldFailed,
  categoriesForSuper,
  categoryIconLookup,
  categoryTileGroup,
  categoryTileName,
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
