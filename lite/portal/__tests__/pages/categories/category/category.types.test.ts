import { describe, expect, it } from 'vitest';
import { categoryValuesFrom, emptyCategoryValues, makeCategorySchema, toCategoryInput, type CategoryFormValues } from '../../../../pages/categories/category';
import { makeCategory } from '../../../fixtures';
import { portalT } from '../../../test-utils';

const schema = makeCategorySchema(portalT);
const VALID: CategoryFormValues = categoryValuesFrom(makeCategory());

const messageFor = <K extends keyof CategoryFormValues>(field: K, value: CategoryFormValues[K]): string | undefined =>
  schema.safeParse({ ...VALID, [field]: value }).error?.issues.find((issue) => issue.path[0] === field)?.message;

describe('category form values', () => {
  it('starts a new category active with sort order 0', () => {
    expect(emptyCategoryValues()).toEqual({ name: '', slug: '', icon: '', sort_order: '0', is_active: true });
  });

  it('reads a stored category, an absent icon as blank', () => {
    expect(categoryValuesFrom(makeCategory({ icon: null, sort_order: 4, is_active: false }))).toEqual({ name: 'Music', slug: 'music', icon: '', sort_order: '4', is_active: false });
  });

  it('sends blanks as null and a blank sort order as 0', () => {
    expect(toCategoryInput({ name: 'Food', slug: '', icon: '', sort_order: '', is_active: true })).toEqual({ name: 'Food', slug: null, icon: null, sort_order: 0, is_active: true });
  });

  it('round-trips a stored category into the upsert input', () => {
    expect(toCategoryInput(VALID)).toEqual({ name: 'Music', slug: 'music', icon: 'MusicNote', sort_order: 1, is_active: true });
  });
});

describe('makeCategorySchema', () => {
  it('accepts a stored category', () => {
    expect(schema.safeParse(VALID).success).toBe(true);
  });

  it('requires a name of at most 60 characters and caps the slug at 80', () => {
    expect(messageFor('name', '')).toBe('Name is required');
    expect(messageFor('name', 'm'.repeat(61))).toBe('Name must be 60 characters or fewer');
    expect(messageFor('slug', 's'.repeat(81))).toBe('Slug must be 80 characters or fewer');
  });

  it('takes a blank icon or a letters-and-digits icon name only', () => {
    expect(messageFor('icon', '')).toBeUndefined();
    expect(messageFor('icon', 'LocalCafe2')).toBeUndefined();
    for (const bad of ['music-note', 'Music Note', '<svg>']) {
      expect(messageFor('icon', bad), bad).toBe('Use an icon name such as MusicNote');
    }
  });

  it('bounds the sort order to 0..9999, blank allowed', () => {
    expect(messageFor('sort_order', '')).toBeUndefined();
    expect(messageFor('sort_order', '9999')).toBeUndefined();
    expect(messageFor('sort_order', '10000')).toBe('Sort order must be 9999 or less');
    expect(messageFor('sort_order', '-3')).toBe('Sort order cannot be negative');
  });
});
