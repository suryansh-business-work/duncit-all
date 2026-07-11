import { isOutdated } from '@/utils/semver';

describe('isOutdated', () => {
  it('returns false for an empty latest (never blocks)', () => {
    expect(isOutdated('1.0.0', '')).toBe(false);
    expect(isOutdated('1.0.0', '   ')).toBe(false);
  });

  it('returns false for a malformed latest', () => {
    expect(isOutdated('1.0.0', 'abc')).toBe(false);
    expect(isOutdated('1.0.0', '1.x.0')).toBe(false);
  });

  it('returns false when current and latest are equal', () => {
    expect(isOutdated('1.2.3', '1.2.3')).toBe(false);
  });

  it('returns false when latest is older than current', () => {
    expect(isOutdated('2.0.0', '1.9.9')).toBe(false);
    expect(isOutdated('1.5.0', '1.4.9')).toBe(false);
    expect(isOutdated('1.0.5', '1.0.4')).toBe(false);
  });

  it('returns true when latest is newer than current', () => {
    expect(isOutdated('1.0.0', '2.0.0')).toBe(true);
    expect(isOutdated('1.4.0', '1.5.0')).toBe(true);
    expect(isOutdated('1.0.4', '1.0.5')).toBe(true);
  });

  it('ignores pre-release / build / extra segments (compares major.minor.patch)', () => {
    expect(isOutdated('1.2.3-beta.1', '1.2.3')).toBe(false);
    expect(isOutdated('1.2.3', '1.2.3+build.9')).toBe(false);
    expect(isOutdated('1.2.3', '1.2.3.9')).toBe(false);
    expect(isOutdated('1.2.3', '1.2.4-rc.1')).toBe(true);
  });

  it('treats missing trailing segments as zero', () => {
    expect(isOutdated('1.2', '1.2.0')).toBe(false);
    expect(isOutdated('1.2', '1.2.1')).toBe(true);
  });

  it('degrades an unparseable current to 0.0.0 (any valid latest blocks)', () => {
    expect(isOutdated('', '1.0.0')).toBe(true);
    expect(isOutdated('not-a-version', '0.0.1')).toBe(true);
  });
});
