import { isOutdated } from '@/utils/semver';

describe('isOutdated (force-update: major/minor only, patch-tolerant)', () => {
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
  });

  it('does NOT force on a patch-only bump (the routine per-deploy version)', () => {
    expect(isOutdated('1.0.4', '1.0.5')).toBe(false);
    expect(isOutdated('1.1.4', '1.1.7')).toBe(false);
    expect(isOutdated('1.2.3', '1.2.4-rc.1')).toBe(false);
    expect(isOutdated('1.2', '1.2.1')).toBe(false);
  });

  it('forces when the MINOR version is behind', () => {
    expect(isOutdated('1.4.0', '1.5.0')).toBe(true);
    expect(isOutdated('1.4.9', '1.5.0')).toBe(true);
    expect(isOutdated('1.2', '1.3.0')).toBe(true);
  });

  it('forces when the MAJOR version is behind', () => {
    expect(isOutdated('1.9.9', '2.0.0')).toBe(true);
  });

  it('ignores pre-release / build / extra segments (compares major.minor)', () => {
    expect(isOutdated('1.2.3-beta.1', '1.2.3')).toBe(false);
    expect(isOutdated('1.2.3', '1.2.3+build.9')).toBe(false);
    expect(isOutdated('1.2.3', '1.2.3.9')).toBe(false);
    expect(isOutdated('1.2.9', '1.3.0-rc.1')).toBe(true);
  });

  it('treats missing trailing segments as zero', () => {
    expect(isOutdated('1.2', '1.2.0')).toBe(false);
  });

  it('degrades an unparseable current to 0.0.0', () => {
    // A major/minor latest over 0.0.0 forces; a patch-only latest does not.
    expect(isOutdated('', '1.0.0')).toBe(true);
    expect(isOutdated('not-a-version', '0.1.0')).toBe(true);
    expect(isOutdated('not-a-version', '0.0.1')).toBe(false);
  });
});
