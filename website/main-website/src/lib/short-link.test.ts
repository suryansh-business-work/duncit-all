import { describe, expect, it } from 'vitest';
import { SHORT_CODE_PATTERN, shortCodeFromPath, shortLinkResolverUrl } from './short-link';

describe('shortCodeFromPath', () => {
  it('recognises a short code', () => {
    expect(shortCodeFromPath('/aB3xY9Zq')).toBe('aB3xY9Zq');
    expect(shortCodeFromPath('/Zq7mKp2a')).toBe('Zq7mKp2a');
    expect(shortCodeFromPath('/1234567A')).toBe('1234567A');
  });

  it('tolerates a trailing slash', () => {
    expect(shortCodeFromPath('/aB3xY9Zq/')).toBe('aB3xY9Zq');
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
    ]) {
      expect(shortCodeFromPath(path)).toBeNull();
    }
  });

  it('rejects near-misses on the shape', () => {
    // lowercase word that happens to carry a digit
    expect(shortCodeFromPath('/aboutus1')).toBeNull();
    // all caps, no digit
    expect(shortCodeFromPath('/ABOUTUSX')).toBeNull();
    // right characters, wrong length
    expect(shortCodeFromPath('/aB3xY9Z')).toBeNull();
    expect(shortCodeFromPath('/aB3xY9Zqq')).toBeNull();
    // a nested path is never a code
    expect(shortCodeFromPath('/pods/aB3xY9Zq')).toBeNull();
    // punctuation is not base62
    expect(shortCodeFromPath('/aB3-Y9Zq')).toBeNull();
  });

  it('exports the pattern the server twin also enforces', () => {
    expect(SHORT_CODE_PATTERN.test('aB3xY9Zq')).toBe(true);
    expect(SHORT_CODE_PATTERN.test('about')).toBe(false);
  });
});

describe('shortLinkResolverUrl', () => {
  it('points at our own resolver, never at a destination in the URL', () => {
    expect(shortLinkResolverUrl('https://server.duncit.com', 'aB3xY9Zq')).toBe(
      'https://server.duncit.com/r/aB3xY9Zq',
    );
  });

  it('does not double the slash when the base carries one', () => {
    expect(shortLinkResolverUrl('https://server.duncit.com/', 'aB3xY9Zq')).toBe(
      'https://server.duncit.com/r/aB3xY9Zq',
    );
  });

  it('carries the visitor query string through', () => {
    expect(shortLinkResolverUrl('https://server.duncit.com', 'aB3xY9Zq', '?fbclid=123')).toBe(
      'https://server.duncit.com/r/aB3xY9Zq?fbclid=123',
    );
  });
});
