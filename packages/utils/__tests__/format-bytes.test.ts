import { describe, expect, it } from 'vitest';
import { formatBytes } from '../src/format-bytes';

describe('formatBytes', () => {
  it('reads zero, negative and missing sizes as 0 B', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });

  it('keeps whole bytes under a kilobyte', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('gives two decimals under 10, one under 100 and none above, trailing zeros dropped', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(8 * 1024 ** 3)).toBe('8 GB');
    expect(formatBytes(12.34 * 1024 ** 2)).toBe('12.3 MB');
    expect(formatBytes(250.6 * 1024 ** 2)).toBe('251 MB');
  });

  it('stops at petabytes', () => {
    expect(formatBytes(2 * 1024 ** 6)).toBe('2048 PB');
  });
});
