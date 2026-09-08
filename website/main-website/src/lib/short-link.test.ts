import { describe, expect, it } from 'vitest';
import { SHORT_CODE_PATTERN, trimSlashes } from './short-link';

/** The REAL trim the HTML server uses, not a copy of it — a second definition
 * here would let the two drift on exactly the input this pair exists to read. */
const isCode = (pathname: string) => SHORT_CODE_PATTERN.test(trimSlashes(pathname));

describe('trimSlashes', () => {
  it('strips the slashes at both ends and nothing in between', () => {
    expect(trimSlashes('/aB3xY9Zq')).toBe('aB3xY9Zq');
    expect(trimSlashes('///aB3xY9Zq///')).toBe('aB3xY9Zq');
    expect(trimSlashes('/blog/post/')).toBe('blog/post');
    expect(trimSlashes('aB3xY9Zq')).toBe('aB3xY9Zq');
  });

  it('answers for a path that is nothing but slashes', () => {
    expect(trimSlashes('/')).toBe('');
    expect(trimSlashes('//////')).toBe('');
    expect(trimSlashes('')).toBe('');
  });

  /*
    The reason it is a walk and not a regex. A trailing-slash regex on this
    input makes a backtracking engine retry the run from every position, and
    the caller is handed the RAW request path — so an anonymous GET would pick
    the length. One pass here, whatever arrives.
  */
  it('stays fast on the input a backtracking regex chokes on', () => {
    const hostile = `${'/'.repeat(200_000)}x`;
    const startedAt = Date.now();
    expect(trimSlashes(hostile)).toBe('x');
    expect(Date.now() - startedAt).toBeLessThan(1000);
  });
});

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
