import { describe, expect, it } from 'vitest';
import { isIdSegment, screenNameFromPath } from '../../src/analytics/screen';

describe('isIdSegment', () => {
  it('recognises ObjectIds, UUIDs, numbers and long tokens with digits', () => {
    expect(isIdSegment('6650f0c2a1b2c3d4e5f60718')).toBe(true);
    expect(isIdSegment('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isIdSegment('42')).toBe(true);
    expect(isIdSegment('sharecode9xk2mz7q')).toBe(true);
  });

  it('keeps words, short codes and near-misses as names', () => {
    expect(isIdSegment('pods')).toBe(false);
    expect(isIdSegment('v2')).toBe(false);
    expect(isIdSegment('a-very-long-route-name')).toBe(false);
    // 36 characters with dashes where a UUID has them, but not hex — and no digit.
    expect(isIdSegment('abcdefgh-ijkl-mnop-qrst-uvwxyzabcdef')).toBe(false);
    // 24 characters, one short of hex — and no digit.
    expect(isIdSegment('abcdefabcdefabcdefabcdeg')).toBe(false);
  });

  it('still treats a malformed UUID or ObjectId as an id when it is a long token with digits', () => {
    expect(isIdSegment('123e4567-e89b-12d3-a456-42661417400z')).toBe(true);
    expect(isIdSegment('6650f0c2a1b2c3d4e5f6071z')).toBe(true);
  });
});

describe('screenNameFromPath', () => {
  it('names every pod page as one screen', () => {
    expect(screenNameFromPath('/pods/6650f0c2a1b2c3d4e5f60718/join')).toBe('/pods/:id/join');
    expect(screenNameFromPath('/pods/6651f0c2a1b2c3d4e5f60719/join')).toBe('/pods/:id/join');
  });

  it('drops the query string and the hash', () => {
    expect(screenNameFromPath('/explore?city=delhi#top')).toBe('/explore');
    expect(screenNameFromPath('/profile#settings')).toBe('/profile');
  });

  it('names the root and trims empty segments', () => {
    expect(screenNameFromPath('/')).toBe('/');
    expect(screenNameFromPath('')).toBe('/');
    expect(screenNameFromPath('//clubs//')).toBe('/clubs');
  });

  it('caps a name at 120 characters', () => {
    expect(screenNameFromPath(`/${'a'.repeat(300)}`)).toHaveLength(120);
  });
});
