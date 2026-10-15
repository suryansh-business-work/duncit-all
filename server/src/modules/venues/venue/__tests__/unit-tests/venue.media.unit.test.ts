/**
 * The shape checks every venue write runs on its videos and licence documents:
 * a YouTube address must be a video (never a channel or a playlist), anything
 * else must be an absolute http(s) link, and the lists are bounded.
 */
import { documentUrl, FSSAI_NUMBER_REGEX, normalizeVideoList, YOUTUBE_URL_REGEX } from '../../venue.media';

const VIDEO_ID = 'dQw4w9WgXcQ';

describe('YOUTUBE_URL_REGEX', () => {
  it.each([
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    `https://youtube.com/watch?feature=share&v=${VIDEO_ID}`,
    `https://m.youtube.com/watch?v=${VIDEO_ID}&t=42s`,
    `https://www.youtube.com/shorts/${VIDEO_ID}`,
    `https://www.youtube.com/embed/${VIDEO_ID}`,
    `https://www.youtube.com/live/${VIDEO_ID}?si=abc`,
    `https://youtu.be/${VIDEO_ID}`,
    `http://youtu.be/${VIDEO_ID}#t=10`,
  ])('captures the video id of %s', (url) => {
    expect(YOUTUBE_URL_REGEX.exec(url)?.[1]).toBe(VIDEO_ID);
  });

  it.each([
    'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
    'https://www.youtube.com/@duncit',
    'https://www.youtube.com/playlist?list=PL590L5WQmH8fJ54F369BLDSqIwcs-TCfs',
    `https://www.youtube.com/watch?v=${VIDEO_ID.slice(0, 10)}`,
    `ftp://youtu.be/${VIDEO_ID}`,
  ])('does not match %s', (url) => {
    expect(YOUTUBE_URL_REGEX.test(url)).toBe(false);
  });
});

describe('FSSAI_NUMBER_REGEX', () => {
  it('accepts exactly 14 digits and nothing else', () => {
    expect(FSSAI_NUMBER_REGEX.test('12345678901234')).toBe(true);
    for (const value of ['1234567890123', '123456789012345', '1234567890123a', '1234 567890123', '']) {
      expect(FSSAI_NUMBER_REGEX.test(value)).toBe(false);
    }
  });
});

describe('normalizeVideoList', () => {
  const clip = 'https://ik.imagekit.io/duncit/prod/venues/clip.mp4';

  it('keeps YouTube video links and uploaded clips, trimmed, blanks dropped and duplicates folded', () => {
    expect(
      normalizeVideoList([` https://youtu.be/${VIDEO_ID} `, '', '   ', clip, clip, `https://youtu.be/${VIDEO_ID}`, 42], 2, 'The venue')
    ).toEqual([`https://youtu.be/${VIDEO_ID}`, clip]);
  });

  it('reads anything that is not a list as no videos', () => {
    expect(normalizeVideoList(undefined, 5, 'The venue')).toEqual([]);
    expect(normalizeVideoList('https://youtu.be/x', 5, 'The venue')).toEqual([]);
  });

  it('allows exactly the limit and refuses one more, counting after duplicates are folded', () => {
    expect(normalizeVideoList([clip, `${clip}?v=2`], 2, '"Paneer Tikka"')).toHaveLength(2);
    expect(() => normalizeVideoList([clip, `${clip}?v=2`, `${clip}?v=3`], 2, '"Paneer Tikka"')).toThrow(
      '"Paneer Tikka" can have at most 2 videos'
    );
  });

  it('refuses a YouTube channel, a handle or a playlist — no player can embed them', () => {
    for (const url of [
      'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
      'https://www.youtube.com/@duncit',
      'https://m.youtube.com/playlist?list=PL590L5WQmH8fJ54F369BLDSqIwcs-TCfs',
      'https://youtu.be/',
    ]) {
      expect(() => normalizeVideoList([url], 5, 'The venue')).toThrow(
        'Enter a YouTube video link (watch, shorts or youtu.be) for The venue'
      );
    }
  });

  it('refuses a link that is not absolute http(s), or is too long to store', () => {
    for (const url of ['not a link', 'javascript:alert(1)', 'ftp://files.example/clip.mp4', `https://cdn.example/${'a'.repeat(2048)}`]) {
      expect(() => normalizeVideoList([url], 5, 'The venue')).toThrow('Enter a valid video link for The venue');
    }
  });

  it('refuses with a BAD_USER_INPUT error', () => {
    try {
      normalizeVideoList(['nope'], 5, 'The venue');
      throw new Error('expected a refusal');
    } catch (error) {
      expect((error as { extensions?: { code?: string } }).extensions?.code).toBe('BAD_USER_INPUT');
    }
  });
});

describe('documentUrl', () => {
  it('keeps a blank as blank and an absolute link trimmed', () => {
    expect(documentUrl(undefined, 'FSSAI licence')).toBe('');
    expect(documentUrl('   ', 'FSSAI licence')).toBe('');
    expect(documentUrl(' https://ik.imagekit.io/duncit/fssai.pdf ', 'FSSAI licence')).toBe(
      'https://ik.imagekit.io/duncit/fssai.pdf'
    );
  });

  it('asks for the upload again when the address is not a web link', () => {
    expect(() => documentUrl('C:\\docs\\fssai.pdf', 'FSSAI licence')).toThrow('Upload the FSSAI licence again');
    expect(() => documentUrl('data:application/pdf;base64,AAAA', 'liquor licence')).toThrow('Upload the liquor licence again');
  });
});
