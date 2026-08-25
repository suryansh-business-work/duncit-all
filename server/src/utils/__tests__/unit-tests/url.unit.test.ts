/**
 * The shared URL shaping.
 *
 * Every one of these strings ends up in an email a member clicks, so the two
 * things worth holding are that a base with a trailing slash and one without
 * produce the SAME link, and that the walk never leaves a `//` in the middle —
 * `https://duncit.com//profile` is a broken link, not a cosmetic one.
 */
import { joinUrl, trimTrailingSlash } from '@utils/url';

describe('trimTrailingSlash', () => {
  it('leaves a base that has no trailing slash alone', () => {
    expect(trimTrailingSlash('https://duncit.com')).toBe('https://duncit.com');
  });

  it('takes off one slash, and every slash', () => {
    expect(trimTrailingSlash('https://duncit.com/')).toBe('https://duncit.com');
    expect(trimTrailingSlash('https://duncit.com////')).toBe('https://duncit.com');
  });

  it('keeps slashes that are not at the end', () => {
    expect(trimTrailingSlash('https://duncit.com/club/yoga')).toBe('https://duncit.com/club/yoga');
  });

  it('answers an empty string for one made only of slashes, and for an empty one', () => {
    expect(trimTrailingSlash('///')).toBe('');
    expect(trimTrailingSlash('')).toBe('');
  });
});

describe('joinUrl', () => {
  it('puts exactly one slash between the base and the path, however either is written', () => {
    expect(joinUrl('https://duncit.com/', '/profile')).toBe('https://duncit.com/profile');
    expect(joinUrl('https://duncit.com', 'profile')).toBe('https://duncit.com/profile');
    expect(joinUrl('https://duncit.com//', 'profile')).toBe('https://duncit.com/profile');
  });

  it('returns the bare base when there is no path to add', () => {
    expect(joinUrl('https://duncit.com/', '')).toBe('https://duncit.com');
  });
});
