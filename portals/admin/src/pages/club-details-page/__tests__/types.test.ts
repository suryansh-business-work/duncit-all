import { describe, expect, it } from 'vitest';
import { isVideoMedia } from '../types';

describe('isVideoMedia', () => {
  it('is true for a VIDEO type, case-insensitively', () => {
    expect(isVideoMedia({ url: 'https://cdn.test/a.mp4', type: 'VIDEO' })).toBe(true);
    expect(isVideoMedia({ url: 'https://cdn.test/a.mp4', type: 'video' })).toBe(true);
  });

  it('is false for an IMAGE type', () => {
    expect(isVideoMedia({ url: 'https://cdn.test/a.jpg', type: 'IMAGE' })).toBe(false);
  });

  it('is false when type is missing or null', () => {
    expect(isVideoMedia({ url: 'https://cdn.test/a.jpg' })).toBe(false);
    expect(isVideoMedia({ url: 'https://cdn.test/a.jpg', type: null })).toBe(false);
  });
});
