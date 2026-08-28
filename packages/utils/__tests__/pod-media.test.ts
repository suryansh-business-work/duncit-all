import { describe, expect, it } from 'vitest';
import { podMediaLink, podMediaPath } from '../src/pod-media';

describe('podMediaPath', () => {
  it('is the one address the media page lives at', () => {
    expect(podMediaPath('DUN-POD-4821')).toBe('/pod/DUN-POD-4821/media');
  });
});

describe('podMediaLink', () => {
  it('joins the base URL a surface was configured with onto the same path', () => {
    expect(podMediaLink('DUN-POD-4821', 'https://duncit.com')).toBe(
      'https://duncit.com/pod/DUN-POD-4821/media',
    );
    expect(podMediaLink('DUN-POD-4821', 'https://mweb.duncit.com')).toBe(
      'https://mweb.duncit.com/pod/DUN-POD-4821/media',
    );
  });
});
