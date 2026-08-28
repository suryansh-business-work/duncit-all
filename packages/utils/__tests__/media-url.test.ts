import { describe, expect, it } from 'vitest';
import { videoSourceUrl } from '../src/media-url';

const IK = 'https://ik.imagekit.io/duncit/pods/run-club.mp4';

describe('videoSourceUrl', () => {
  it('asks ImageKit for the stored file, so the metered re-encode is never spent', () => {
    expect(videoSourceUrl(IK)).toBe(`${IK}?tr=orig-true`);
  });

  it('appends to a URL that already carries other query parameters', () => {
    expect(videoSourceUrl(`${IK}?updatedAt=1724832000`)).toBe(
      `${IK}?updatedAt=1724832000&tr=orig-true`,
    );
  });

  it('is idempotent — a URL stored with the flag survives a second pass', () => {
    expect(videoSourceUrl(videoSourceUrl(IK))).toBe(`${IK}?tr=orig-true`);
  });

  it('leaves a transformation somebody asked for on purpose alone', () => {
    expect(videoSourceUrl(`${IK}?tr=h-480`)).toBe(`${IK}?tr=h-480`);
    expect(videoSourceUrl(`${IK}?updatedAt=1&tr=h-480`)).toBe(`${IK}?updatedAt=1&tr=h-480`);
  });

  it('keeps a fragment at the end, where a player expects it', () => {
    expect(videoSourceUrl(`${IK}#t=3`)).toBe(`${IK}?tr=orig-true#t=3`);
  });

  it('rewrites nothing that is not served by our CDN', () => {
    expect(videoSourceUrl('https://videos.pexels.com/clip.mp4')).toBe(
      'https://videos.pexels.com/clip.mp4',
    );
    expect(videoSourceUrl('file:///tmp/local.mp4')).toBe('file:///tmp/local.mp4');
    expect(videoSourceUrl('https://imagekit.io.evil.example/clip.mp4')).toBe(
      'https://imagekit.io.evil.example/clip.mp4',
    );
  });

  it('answers with an empty string when there is no video to play', () => {
    expect(videoSourceUrl(null)).toBe('');
    expect(videoSourceUrl(undefined)).toBe('');
    expect(videoSourceUrl('   ')).toBe('');
  });
});
