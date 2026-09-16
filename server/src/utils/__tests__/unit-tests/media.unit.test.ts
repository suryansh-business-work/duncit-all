/**
 * Media reference validation and the "first still picture" picker shared by
 * every surface that stores a `{ url, type }` list — a pod, a club, a venue,
 * and now an official status. One wrong answer here (a video URL handed to
 * something that only shows a still, or an inline data: URL slipping past the
 * picker) breaks a WhatsApp header, a link preview or an email hero for every
 * caller, not just the one that got it wrong first.
 */
import { firstImageUrl, validateMediaUrl } from '@utils/media';

describe('validateMediaUrl', () => {
  it('rejects an empty string', () => {
    expect(() => validateMediaUrl('')).toThrow(/image_url is required/i);
  });

  it('rejects a non-string value', () => {
    expect(() => validateMediaUrl(123 as unknown as string)).toThrow(/image_url is required/i);
  });

  it('uses the caller-supplied label in the message', () => {
    expect(() => validateMediaUrl('', 'media_url')).toThrow(/media_url is required/i);
  });

  it('rejects a non-http(s) URL', () => {
    expect(() => validateMediaUrl('ftp://duncit.com/a.png')).toThrow(/must be an http\(s\) URL/i);
  });

  // A data: URL never reaches the dedicated "inline data URLs" check below —
  // it is already rejected by the http(s)-prefix check first.
  it('rejects an inline data URL', () => {
    expect(() => validateMediaUrl('data:image/png;base64,abc')).toThrow(/must be an http\(s\) URL/i);
  });

  it('accepts a valid http URL', () => {
    expect(() => validateMediaUrl('http://duncit.com/a.png')).not.toThrow();
  });

  it('accepts a valid https URL', () => {
    expect(() => validateMediaUrl('https://ik.imagekit.io/duncit/a.png')).not.toThrow();
  });
});

describe('firstImageUrl', () => {
  it('returns an empty string when there is no media', () => {
    expect(firstImageUrl(null)).toBe('');
    expect(firstImageUrl(undefined)).toBe('');
    expect(firstImageUrl([])).toBe('');
  });

  it('picks the first IMAGE entry, case-insensitively, and trims the url', () => {
    const media = [
      { url: 'https://duncit.com/clip.mp4', type: 'VIDEO' },
      { url: '  https://duncit.com/cover.jpg  ', type: 'image' },
    ];
    expect(firstImageUrl(media)).toBe('https://duncit.com/cover.jpg');
  });

  it('never returns a video URL, even when it is the only entry', () => {
    const media = [{ url: 'https://duncit.com/clip.mp4', type: 'VIDEO' }];
    expect(firstImageUrl(media)).toBe('');
  });

  it('skips an IMAGE entry with a blank url and keeps looking', () => {
    const media = [
      { url: '   ', type: 'IMAGE' },
      { url: 'https://duncit.com/cover.jpg', type: 'IMAGE' },
    ];
    expect(firstImageUrl(media)).toBe('https://duncit.com/cover.jpg');
  });
});
