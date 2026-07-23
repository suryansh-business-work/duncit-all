import { fileDetailChips, formatBytes, formatDuration } from '@/components/media-crop/format';

describe('formatBytes', () => {
  it('formats bytes, KB and MB and returns empty for unknown', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(0)).toBe('');
    expect(formatBytes(null)).toBe('');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds as m:ss and returns empty for none', () => {
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(9_000)).toBe('0:09');
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(null)).toBe('');
  });
});

describe('fileDetailChips', () => {
  it('lists type, size, resolution for an image (no duration)', () => {
    const chips = fileDetailChips({
      fileName: 'a.jpg',
      mimeType: 'image/jpeg',
      fileSize: 2048,
      width: 1920,
      height: 1080,
      kind: 'image',
    });
    expect(chips).toEqual(['image/jpeg', '2 KB', '1920×1080px']);
  });

  it('adds duration for a video and drops missing fields', () => {
    const chips = fileDetailChips({
      fileName: 'v.mp4',
      mimeType: 'video/mp4',
      fileSize: null,
      width: 0,
      height: 0,
      kind: 'video',
      durationMs: 30_000,
    });
    expect(chips).toEqual(['video/mp4', '0:30']);
  });
});
