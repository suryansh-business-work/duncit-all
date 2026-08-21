import { describe, expect, it } from 'vitest';
import {
  MAX_COVER_IMAGES,
  addToSelection,
  coverCategoryName,
  coverSearchTerm,
  coverSlotsLeft,
  pickerBatchSize,
  type CoverCategoryNames,
} from '../src/cover-image';

/** A host's onboarded category, with only the names under test set deliberately. */
const names = (over: Partial<CoverCategoryNames> = {}): CoverCategoryNames => ({
  super_category_name: 'Sports',
  category_name: 'Racquet',
  sub_category_name: 'Badminton',
  ...over,
});

describe('MAX_COVER_IMAGES', () => {
  it('caps a cover picker at five images per visit', () => {
    expect(MAX_COVER_IMAGES).toBe(5);
  });
});

describe('coverSearchTerm', () => {
  // A bare sub-category returns equipment close-ups; the people terms are what
  // make Pexels return rooms full of people that read as a pod.
  it('appends the group-of-people terms to the sub-category', () => {
    expect(coverSearchTerm('Badminton')).toBe('Badminton group of people');
  });

  it('trims the sub-category before building the query', () => {
    expect(coverSearchTerm('  Badminton  ')).toBe('Badminton group of people');
  });

  // A blank query is answered with Pexels' curated feed — a better empty state
  // than searching for ' group of people' on its own.
  it('returns an empty query when nothing is selected', () => {
    expect(coverSearchTerm(undefined)).toBe('');
    expect(coverSearchTerm(null)).toBe('');
    expect(coverSearchTerm('')).toBe('');
    expect(coverSearchTerm('   ')).toBe('');
  });
});

describe('coverCategoryName', () => {
  it('prefers the sub-category, the most specific name', () => {
    expect(coverCategoryName(names())).toBe('Badminton');
  });

  // Hosts onboarded before a level existed can have the lower names blank; the
  // walk outward is what stops the picker opening on a blank box.
  it('falls back to the category when the sub-category is blank', () => {
    expect(coverCategoryName(names({ sub_category_name: '' }))).toBe('Racquet');
    expect(coverCategoryName(names({ sub_category_name: null }))).toBe('Racquet');
    expect(coverCategoryName(names({ sub_category_name: undefined }))).toBe('Racquet');
  });

  it('falls back to the super-category when both lower names are blank', () => {
    expect(coverCategoryName(names({ sub_category_name: '  ', category_name: null }))).toBe(
      'Sports',
    );
  });

  it('trims the name it returns', () => {
    expect(coverCategoryName(names({ sub_category_name: '  Badminton  ' }))).toBe('Badminton');
  });

  it('returns nothing only when the host has no named category at all', () => {
    expect(coverCategoryName(undefined)).toBe('');
    expect(coverCategoryName(null)).toBe('');
    expect(coverCategoryName({})).toBe('');
    expect(
      coverCategoryName({ super_category_name: ' ', category_name: '', sub_category_name: null }),
    ).toBe('');
  });
});

describe('coverSlotsLeft', () => {
  it('counts down from the cover cap by default', () => {
    expect(coverSlotsLeft(0)).toBe(MAX_COVER_IMAGES);
    expect(coverSlotsLeft(2)).toBe(3);
    expect(coverSlotsLeft(5)).toBe(0);
  });

  it('counts down from an explicit cap when one is given', () => {
    expect(coverSlotsLeft(2, 10)).toBe(8);
    expect(coverSlotsLeft(0, 1)).toBe(1);
  });

  // Only an ABSENT cap means "use the cover cap": a field that passes 0 takes
  // nothing, and must not be handed five slots because 0 happens to be falsy.
  it('honours an explicit cap of zero instead of falling back to the default', () => {
    expect(coverSlotsLeft(0, 0)).toBe(0);
    expect(coverSlotsLeft(3, 0)).toBe(0);
    expect(coverSlotsLeft(3, undefined)).toBe(2);
  });

  // A field that somehow went over the cap must still open (to remove images),
  // so the answer is 0, never a negative the picker would choke on.
  it('never goes negative for a field already over the cap', () => {
    expect(coverSlotsLeft(7)).toBe(0);
    expect(coverSlotsLeft(12, 10)).toBe(0);
  });

  it('treats a negative or non-numeric count as nothing chosen yet', () => {
    expect(coverSlotsLeft(-3)).toBe(MAX_COVER_IMAGES);
    expect(coverSlotsLeft(Number.NaN)).toBe(MAX_COVER_IMAGES);
    expect(coverSlotsLeft('abc' as unknown as number)).toBe(MAX_COVER_IMAGES);
  });

  it('floors a fractional count before subtracting', () => {
    expect(coverSlotsLeft(2.9)).toBe(3);
  });
});

describe('pickerBatchSize', () => {
  // The five is a batch size, not a lifetime limit: edit-time media and
  // post-pod photos were never capped, and capping them would remove a feature.
  it('returns a full batch on every open for a field with no ceiling', () => {
    expect(pickerBatchSize(0)).toBe(MAX_COVER_IMAGES);
    expect(pickerBatchSize(100, undefined)).toBe(MAX_COVER_IMAGES);
    expect(pickerBatchSize(100, null)).toBe(MAX_COVER_IMAGES);
  });

  it('shrinks the batch to what the ceiling still allows', () => {
    expect(pickerBatchSize(2, 5)).toBe(3);
    expect(pickerBatchSize(5, 5)).toBe(0);
    expect(pickerBatchSize(9, 5)).toBe(0);
  });

  // A ceiling above the batch size does not let one open take more than five.
  it('never exceeds one batch even under a generous ceiling', () => {
    expect(pickerBatchSize(0, 20)).toBe(MAX_COVER_IMAGES);
    expect(pickerBatchSize(17, 20)).toBe(3);
  });

  // "No ceiling" is null/undefined, not falsy: a field whose ceiling is 0 takes
  // nothing, and a picker that read 0 as "uncapped" would hand it a full batch.
  it('treats a zero ceiling as a ceiling, not as no ceiling', () => {
    expect(pickerBatchSize(0, 0)).toBe(0);
    expect(pickerBatchSize(4, 0)).toBe(0);
  });
});

describe('addToSelection', () => {
  it('appends a new URL without mutating the incoming selection', () => {
    const current = ['a.jpg'];
    const next = addToSelection(current, 'b.jpg', 5);
    expect(next).toEqual(['a.jpg', 'b.jpg']);
    expect(current).toEqual(['a.jpg']);
    expect(next).not.toBe(current);
  });

  // Returning the SAME array is what lets React skip the re-render.
  it('returns the very same array when the URL is already selected', () => {
    const current = ['a.jpg', 'b.jpg'];
    expect(addToSelection(current, 'b.jpg', 5)).toBe(current);
  });

  it('returns the very same array once the selection is at the cap', () => {
    const current = ['a.jpg', 'b.jpg'];
    expect(addToSelection(current, 'c.jpg', 2)).toBe(current);
    expect(addToSelection(current, 'c.jpg', 1)).toBe(current);
  });

  it('returns the very same array for an empty URL', () => {
    const current: string[] = [];
    expect(addToSelection(current, '', 5)).toBe(current);
  });

  it('still adds the first URL when the cap is one', () => {
    expect(addToSelection([], 'a.jpg', 1)).toEqual(['a.jpg']);
  });
});
