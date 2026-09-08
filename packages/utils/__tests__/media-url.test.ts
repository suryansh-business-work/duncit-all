import { describe, expect, it } from 'vitest';
import {
  coverImageUrl,
  isVideoMedia,
  isVideoUrl,
  mediaTypeForUrl,
  videoSourceUrl,
} from '../src/media-url';

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

describe('isVideoUrl', () => {
  it('recognises a video whose address carries a query string', () => {
    expect(isVideoUrl(`${IK}?updatedAt=1788852029004`)).toBe(true);
    expect(isVideoUrl(`${IK}?tr=orig-true`)).toBe(true);
    expect(isVideoUrl(`${IK}#t=3`)).toBe(true);
  });

  it('recognises every container the upload path accepts, in any case', () => {
    for (const ext of ['mp4', 'MOV', 'm4v', 'avi', 'webm', 'mkv', '3gp', 'ts', 'flv', 'wmv', 'mpeg', 'mpg']) {
      expect(isVideoUrl(`https://ik.imagekit.io/duncit/clip.${ext}`)).toBe(true);
    }
  });

  it('does not mistake a picture for a clip', () => {
    expect(isVideoUrl('https://ik.imagekit.io/duncit/court.jpg')).toBe(false);
    expect(isVideoUrl('https://ik.imagekit.io/duncit/mp4-poster.jpg')).toBe(false);
    expect(isVideoUrl('   ')).toBe(false);
    expect(isVideoUrl(null)).toBe(false);
    expect(isVideoUrl(undefined)).toBe(false);
  });
});

describe('mediaTypeForUrl', () => {
  it('types an uploaded URL the writer said nothing about', () => {
    expect(mediaTypeForUrl(`${IK}?updatedAt=1`)).toBe('VIDEO');
    expect(mediaTypeForUrl('https://ik.imagekit.io/duncit/court.jpg')).toBe('IMAGE');
  });
});

describe('isVideoMedia', () => {
  it('plays a row the writer recorded as a video', () => {
    expect(isVideoMedia({ url: IK, type: 'VIDEO' })).toBe(true);
    expect(isVideoMedia({ url: IK, type: 'video' })).toBe(true);
  });

  it('plays a clip that was stored as an IMAGE by the old extension test', () => {
    expect(isVideoMedia({ url: `${IK}?updatedAt=1`, type: 'IMAGE' })).toBe(true);
  });

  it('falls back to the address when the row carries no type at all', () => {
    expect(isVideoMedia({ url: IK })).toBe(true);
    expect(isVideoMedia({ url: IK, type: null })).toBe(true);
    expect(isVideoMedia({ url: 'https://ik.imagekit.io/duncit/court.jpg' })).toBe(false);
  });

  it('answers false for a row that is not there', () => {
    expect(isVideoMedia(null)).toBe(false);
    expect(isVideoMedia(undefined)).toBe(false);
  });
});

describe('coverImageUrl', () => {
  const still = 'https://ik.imagekit.io/duncit/clubs/court.jpg';

  it('skips a video-first cover so the card shows the club, not a blank tile', () => {
    expect(coverImageUrl([{ url: IK, type: 'IMAGE' }, { url: still, type: 'IMAGE' }])).toBe(still);
  });

  it('has nothing to offer for a cover that is only video', () => {
    expect(coverImageUrl([{ url: IK, type: 'VIDEO' }])).toBeUndefined();
  });

  it('ignores a row with no address', () => {
    expect(coverImageUrl([{ url: '', type: 'IMAGE' }, { url: still, type: 'IMAGE' }])).toBe(still);
  });

  it('answers undefined when there is no cover', () => {
    expect(coverImageUrl([])).toBeUndefined();
    expect(coverImageUrl(null)).toBeUndefined();
    expect(coverImageUrl(undefined)).toBeUndefined();
  });
});
