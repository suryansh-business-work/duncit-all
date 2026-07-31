import { describe, expect, it } from 'vitest';
import { categoryPath } from './categoryPath';

describe('categoryPath', () => {
  it('joins the three levels with the › separator', () => {
    expect(
      categoryPath({
        super_category_name: 'Sports',
        category_name: 'Racket',
        sub_category_name: 'Badminton',
      }),
    ).toBe('Sports › Racket › Badminton');
  });

  it('skips levels that are missing or blank', () => {
    expect(categoryPath({ super_category_name: 'Sports', sub_category_name: 'Badminton' })).toBe(
      'Sports › Badminton',
    );
    expect(categoryPath({ super_category_name: 'Sports', category_name: '', sub_category_name: null })).toBe(
      'Sports',
    );
  });

  it('returns an empty string when nothing is named', () => {
    expect(categoryPath({})).toBe('');
  });
});
