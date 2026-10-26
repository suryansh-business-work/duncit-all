import { assertEveryCategoryGrouped, maskSecret } from '../../envEntry.fields';

describe('maskSecret', () => {
  it('shows nothing for no value', () => {
    expect(maskSecret('')).toBe('');
  });

  it('hides a short value entirely', () => {
    expect(maskSecret('abc')).toBe('••••••');
    expect(maskSecret('abcdef')).toBe('••••••');
  });

  it('keeps the first and last three characters of a longer value', () => {
    expect(maskSecret('abcdefg')).toBe('abc••••••efg');
    expect(maskSecret('sk-live-1234567890')).toBe('sk-••••••890');
  });
});

describe('assertEveryCategoryGrouped', () => {
  it('passes when every category has a group', () => {
    expect(() => assertEveryCategoryGrouped(['EMAIL', 'PEXELS'], () => true)).not.toThrow();
    expect(() => assertEveryCategoryGrouped([], () => false)).not.toThrow();
  });

  it('names every category that no group lists', () => {
    expect(() => assertEveryCategoryGrouped(['EMAIL', 'NEW_ONE', 'ANOTHER'], (c) => c === 'EMAIL')).toThrow(
      'Env categories with no sidebar group: NEW_ONE, ANOTHER. Add them to CATEGORY_GROUPS.'
    );
  });
});
