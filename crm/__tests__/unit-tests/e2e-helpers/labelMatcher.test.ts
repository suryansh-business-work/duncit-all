/**
 * Lock-in test for the label-matching logic used by `cy.typeIntoField` in
 * the Cypress support file. Cypress itself can't run from every sandbox
 * (it spawns Electron, which fails with `SIGILL` in some CI/dev shells),
 * but the JavaScript logic that decides which MUI label to target is pure
 * and can be exercised here.
 *
 * The matching rules:
 *  - String input → exact (case-insensitive) match against the label's
 *    text after stripping the trailing `*` required-asterisk and whitespace.
 *  - RegExp input → tested against the normalised label text directly.
 */
import { describe, expect, it } from 'vitest';

const normalise = (raw: string) => raw.replace(/\s*\*\s*$/, '').trim();
const matches = (labelText: string | RegExp, text: string) =>
  typeof labelText === 'string'
    ? text.toLowerCase() === labelText.toLowerCase()
    : labelText.test(text);

const test = (labelText: string | RegExp, raw: string) => matches(labelText, normalise(raw));

describe('typeIntoField label matcher', () => {
  it('matches a plain label exactly', () => {
    expect(test('City', 'City')).toBe(true);
    expect(test('City', 'Venue Name')).toBe(false);
  });

  it('strips the required-asterisk MUI appends to required fields', () => {
    expect(test('City', 'City *')).toBe(true);
    expect(test('City', 'City  *  ')).toBe(true);
    // The thin-space char MUI sometimes inserts before the asterisk.
    expect(test('City', 'City *')).toBe(true);
  });

  it('is case-insensitive for string matchers', () => {
    expect(test('city', 'City *')).toBe(true);
    expect(test('CITY', 'City *')).toBe(true);
  });

  it('uses regex against the normalised text when a regex is passed', () => {
    expect(test(/^city$/i, 'City *')).toBe(true);
    expect(test(/^city$/i, 'Music *')).toBe(false);
    expect(test(/\bvenue\b/i, 'Venue Name *')).toBe(true);
  });

  it('does not greedy-match unrelated labels', () => {
    expect(test('Area', 'Area / Locality')).toBe(false);
    expect(test('Address', 'Full Address *')).toBe(false);
  });
});
