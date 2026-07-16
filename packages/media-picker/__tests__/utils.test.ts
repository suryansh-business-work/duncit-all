import { describe, expect, it } from 'vitest';
import { pickBestVideoFile, validateFile } from '../src/utils';

const file = (type: string, mb: number) =>
  ({ type, size: mb * 1024 * 1024 }) as File;

const IMAGES_ONLY = { allowImage: true, allowVideo: false, allowDocuments: false };
const IMAGES_AND_VIDEO = { allowImage: true, allowVideo: true, allowDocuments: false };
const IMAGES_AND_DOCS = { allowImage: true, allowVideo: false, allowDocuments: true };

describe('validateFile', () => {
  it('accepts an image within the 15 MB cap', () => {
    expect(validateFile(file('image/png', 14), IMAGES_AND_VIDEO)).toBeNull();
  });

  it('rejects an oversized image', () => {
    expect(validateFile(file('image/png', 16), IMAGES_AND_VIDEO)).toMatch(/max 15 MB/);
  });

  it('accepts a video up to 100 MB when video is allowed', () => {
    expect(validateFile(file('video/mp4', 99), IMAGES_AND_VIDEO)).toBeNull();
    expect(validateFile(file('video/mp4', 101), IMAGES_AND_VIDEO)).toMatch(/max 100 MB/);
  });

  // The regression this guards: an accept="image/*" picker (mWeb avatar, admin
  // branding) must NOT take a video just because it is "an image or a video".
  it('rejects a video when the picker only accepts images', () => {
    expect(validateFile(file('video/mp4', 5), IMAGES_ONLY)).toMatch(/image or video/i);
  });

  it('accepts a PDF up to 50 MB only when documents are allowed', () => {
    expect(validateFile(file('application/pdf', 49), IMAGES_AND_DOCS)).toBeNull();
    expect(validateFile(file('application/pdf', 51), IMAGES_AND_DOCS)).toMatch(/max 50 MB/);
    expect(validateFile(file('application/pdf', 1), IMAGES_AND_VIDEO)).toMatch(/image or video/i);
  });

  it('asks for a PDF when a document picker gets something else', () => {
    expect(validateFile(file('text/plain', 1), IMAGES_AND_DOCS)).toMatch(/PDF document/);
  });
});

describe('pickBestVideoFile', () => {
  it('returns null when Pexels gives no files', () => {
    expect(pickBestVideoFile({ video_files: [] })).toBeNull();
  });

  it('returns null when the video_files key is absent entirely', () => {
    expect(pickBestVideoFile({})).toBeNull();
  });

  it('prefers HD, then the widest, but stays at or below 1080p', () => {
    const best = pickBestVideoFile({
      video_files: [
        { quality: 'sd', width: 640, height: 360 },
        { quality: 'hd', width: 3840, height: 2160 },
        { quality: 'hd', width: 1920, height: 1080 },
      ],
    });
    expect(best).toMatchObject({ width: 1920, height: 1080 });
  });

  it('falls back to the widest option when every file exceeds 1080p', () => {
    const best = pickBestVideoFile({
      video_files: [
        { quality: 'sd', width: 1280, height: 2000 },
        { quality: 'hd', width: 1920, height: 2160 },
      ],
    });
    // No file is <= 1080p, so the sorted head (HD + widest) wins by fallback.
    expect(best).toMatchObject({ quality: 'hd', width: 1920 });
  });

  // Both orderings are supplied so the sort comparator sees a width-less file in
  // both its `a` and `b` argument slots, exercising both `|| 0` fallbacks.
  it('treats missing width as zero with the widthless file listed first', () => {
    const best = pickBestVideoFile({
      video_files: [
        { quality: 'hd', height: 400 },
        { quality: 'hd', width: 1920, height: 400 },
      ],
    });
    expect(best).toMatchObject({ width: 1920 });
  });

  it('treats missing width as zero with the widthless file listed last', () => {
    const best = pickBestVideoFile({
      video_files: [
        { quality: 'hd', width: 1920, height: 400 },
        { quality: 'hd', height: 400 },
      ],
    });
    expect(best).toMatchObject({ width: 1920 });
  });

  // The HD file listed first forces a non-HD file into the comparator's `a`
  // slot, covering the `: 0` side of the quality ternary.
  it('ranks a non-HD file below an HD one regardless of input order', () => {
    const best = pickBestVideoFile({
      video_files: [
        { quality: 'hd', width: 1280, height: 720 },
        { quality: 'sd', width: 3840, height: 1000 },
      ],
    });
    expect(best).toMatchObject({ quality: 'hd' });
  });

  it('treats missing height as zero (a heightless file counts as <= 1080p)', () => {
    const best = pickBestVideoFile({ video_files: [{ quality: 'sd', width: 800 }] });
    expect(best).toMatchObject({ width: 800 });
  });
});
