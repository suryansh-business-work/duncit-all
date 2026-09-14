import { describe, expect, it } from 'vitest';
import { aiChips, aiOneOf, aiText } from '../../src/shared/aiFillSanitize';

/**
 * The narrowing an AI fill goes through before it reaches a form.
 *
 * The model is prompted with the form's shape but not bound by it, so each
 * helper must turn anything unexpected into `undefined` — the caller's cue to
 * keep what the admin already had.
 */
describe('aiChips', () => {
  it('keeps trimmed non-empty strings and drops everything else', () => {
    expect(aiChips(['  Board Games ', '', 42, null, 'Catan Night', '   '])).toEqual([
      'Board Games',
      'Catan Night',
    ]);
  });

  it('caps the list at twenty by default', () => {
    const tags = Array.from({ length: 25 }, (_, i) => `tag-${i + 1}`);
    const chips = aiChips(tags);
    expect(chips).toHaveLength(20);
    expect(chips?.at(-1)).toBe('tag-20');
  });

  it('honours a custom cap', () => {
    expect(aiChips(['Wi-Fi', 'AC', 'Parking'], 2)).toEqual(['Wi-Fi', 'AC']);
  });

  it('answers undefined for anything that is not an array', () => {
    expect(aiChips('Wi-Fi, AC')).toBeUndefined();
    expect(aiChips(undefined)).toBeUndefined();
    expect(aiChips({ 0: 'Wi-Fi' })).toBeUndefined();
  });
});

describe('aiText', () => {
  it('trims a string', () => {
    expect(aiText('  Urban Hikers Bengaluru  ')).toBe('Urban Hikers Bengaluru');
  });

  it('answers undefined for a blank string so the previous value survives', () => {
    expect(aiText('    ')).toBeUndefined();
    expect(aiText('')).toBeUndefined();
  });

  it('answers undefined for a non-string', () => {
    expect(aiText(60)).toBeUndefined();
    expect(aiText(null)).toBeUndefined();
  });
});

describe('aiOneOf', () => {
  const modes = ['PHYSICAL', 'VIRTUAL'] as const;

  it('passes a listed option through', () => {
    expect(aiOneOf('VIRTUAL', modes)).toBe('VIRTUAL');
  });

  it('refuses a value the select cannot render', () => {
    expect(aiOneOf('HYBRID', modes)).toBeUndefined();
    expect(aiOneOf('virtual', modes)).toBeUndefined();
  });

  it('refuses a non-string', () => {
    expect(aiOneOf(1, modes)).toBeUndefined();
  });
});
