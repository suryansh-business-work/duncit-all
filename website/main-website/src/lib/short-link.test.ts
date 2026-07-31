import { describe, expect, it } from 'vitest';
import { SHORT_CODE_PATTERN } from './short-link';

/** What the inline redirect script does to location.pathname before testing. */
const segment = (pathname: string) => pathname.replace(/^\/+/, '').replace(/\/+$/, '');
const isCode = (pathname: string) => SHORT_CODE_PATTERN.test(segment(pathname));

describe('SHORT_CODE_PATTERN', () => {
  it('recognises a generated short code', () => {
    for (const path of ['/aB3xY9Zq', '/Zq7mKp2a', '/1234567A', '/A1bcdefg']) {
      expect(isCode(path)).toBe(true);
    }
  });

  it('tolerates a trailing slash', () => {
    expect(isCode('/aB3xY9Zq/')).toBe(true);
  });

  // The whole point of the narrow shape: a real page of this site must never
  // be mistaken for a link and bounced to the API.
  it('leaves every real page alone', () => {
    for (const path of [
      '/',
      '/about',
      '/contact',
      '/careers',
      '/privacy',
      '/blog',
      '/support',
      '/safety',
      '/blog/post',
      '/safety/tools',
    ]) {
      expect(isCode(path)).toBe(false);
    }
  });

  it('rejects near-misses on the shape', () => {
    // lowercase word that happens to carry a digit
    expect(isCode('/aboutus1')).toBe(false);
    // all caps, no digit
    expect(isCode('/ABOUTUSX')).toBe(false);
    // right characters, wrong length
    expect(isCode('/aB3xY9Z')).toBe(false);
    expect(isCode('/aB3xY9Zqq')).toBe(false);
    // a nested path is never a code
    expect(isCode('/pods/aB3xY9Zq')).toBe(false);
    // punctuation is not base62
    expect(isCode('/aB3-Y9Zq')).toBe(false);
  });
});
