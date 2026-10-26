/**
 * The shared URL shaping.
 *
 * Every one of these strings ends up in an email a member clicks, so the two
 * things worth holding are that a base with a trailing slash and one without
 * produce the SAME link, and that the walk never leaves a `//` in the middle —
 * `https://duncit.com//profile` is a broken link, not a cosmetic one.
 */
import { isUploadedPhotoUrl, joinUrl, trimTrailingSlash } from '@utils/url';

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

/**
 * A photo a counter offer may carry: uploaded from the mover's own device, so
 * served over https by our ImageKit CDN — never a stock-library import, never a
 * video, never another host dressed up to look like ours.
 */
describe('isUploadedPhotoUrl', () => {
  it('accepts an https photo on our CDN, on any of its subdomains', () => {
    expect(isUploadedPhotoUrl('https://ik.imagekit.io/duncit/staging/offer/setup.jpg')).toBe(true);
    expect(isUploadedPhotoUrl('https://IK.ImageKit.io/duncit/setup.PNG')).toBe(true);
    expect(isUploadedPhotoUrl('https://imagekit.io/duncit/setup.webp')).toBe(true);
  });

  it('reads only the path for the file type, so a transformation in the query does not make it a video', () => {
    expect(isUploadedPhotoUrl('https://ik.imagekit.io/duncit/setup.jpg?tr=w-400&f=.mp4')).toBe(true);
  });

  it.each([
    ['plain http', 'http://ik.imagekit.io/duncit/setup.jpg'],
    ['a stock-library import', 'https://images.pexels.com/photos/1/setup.jpg'],
    ['an Unsplash import', 'https://images.unsplash.com/photo-1'],
    ['a host that only ends in our name', 'https://evilimagekit.io/setup.jpg'],
    ['a host that only starts with our name', 'https://ik.imagekit.io.evil.example/setup.jpg'],
    ['an mp4 video', 'https://ik.imagekit.io/duncit/tour.mp4'],
    ['a MOV video, in capitals', 'https://ik.imagekit.io/duncit/tour.MOV'],
    ['a webm video', 'https://ik.imagekit.io/duncit/tour.webm'],
    ['text that is not an address', 'not a url'],
    ['an empty string', ''],
  ])('refuses %s', (_label, url) => {
    expect(isUploadedPhotoUrl(url)).toBe(false);
  });
});
