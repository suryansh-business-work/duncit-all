import { describe, expect, it } from 'vitest';
import { APPS, PORTALS, WEBSITES } from '../src/config';

describe('config identifier lists', () => {
  it('exposes the app keys', () => {
    expect(APPS).toEqual(['server', 'mWeb', 'mobileApp']);
  });

  it('includes known portals and no duplicates', () => {
    expect(PORTALS).toContain('crm');
    expect(PORTALS).toContain('finance');
    expect(PORTALS).toContain('developers-portal');
    expect(new Set(PORTALS).size).toBe(PORTALS.length);
  });

  it('includes the marketing websites and no duplicates', () => {
    expect(WEBSITES).toEqual(['duncit', 'partners', 'ads', 'status', 'earnwith']);
    expect(new Set(WEBSITES).size).toBe(WEBSITES.length);
  });
});
