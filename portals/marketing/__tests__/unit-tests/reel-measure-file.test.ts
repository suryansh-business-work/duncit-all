import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kindOf, measureFile } from '../../src/pages/reels/studio/sources/measureFile';

/**
 * A picked file's natural size, read off a local object URL. jsdom decodes
 * nothing, so the picture and the clip are stood in for: each reports a size
 * when its source is set, or fails to, as a real decoder would.
 */

const file = (name: string, type: string) => new File(['x'], name, { type });

/** A picture that decodes to 640 × 480, or refuses to. */
class FakeImage {
  onload: (() => void) | null = null;

  onerror: (() => void) | null = null;

  naturalWidth = 640;

  naturalHeight = 480;

  set src(_value: string) {
    queueMicrotask(() => (FakeImage.broken ? this.onerror?.() : this.onload?.()));
  }

  static broken = false;
}

/** A clip that reports 1920 × 1080 from its metadata, or refuses to. */
const fakeVideo = {
  preload: '',
  videoWidth: 1920,
  videoHeight: 1080,
  onloadedmetadata: null as (() => void) | null,
  onerror: null as (() => void) | null,
  broken: false,
  set src(_value: string) {
    queueMicrotask(() => (fakeVideo.broken ? fakeVideo.onerror?.() : fakeVideo.onloadedmetadata?.()));
  },
};

const createObjectURL = vi.fn(() => 'blob:local');
const revokeObjectURL = vi.fn();
const realImage = globalThis.Image;
const realCreateElement = document.createElement.bind(document);

beforeEach(() => {
  FakeImage.broken = false;
  fakeVideo.broken = false;
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  vi.stubGlobal('Image', FakeImage);
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => (tag === 'video' ? (fakeVideo as unknown as HTMLElement) : realCreateElement(tag)));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('Image', realImage);
});

describe('kindOf', () => {
  it('tells pictures and clips from everything else', () => {
    expect(kindOf({ type: 'image/png' })).toBe('image');
    expect(kindOf({ type: 'video/mp4' })).toBe('video');
    expect(kindOf({ type: 'application/pdf' })).toBe('other');
  });
});

describe('measureFile', () => {
  it('measures a picture off its object URL and lets the URL go', async () => {
    await expect(measureFile(file('poster.png', 'image/png'))).resolves.toEqual({ width: 640, height: 480 });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:local');
  });

  it('measures a clip from its metadata', async () => {
    await expect(measureFile(file('clip.mp4', 'video/mp4'))).resolves.toEqual({ width: 1920, height: 1080 });
    expect(fakeVideo.preload).toBe('metadata');
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('answers 0 × 0 for a file the browser cannot decode, rather than failing the upload', async () => {
    FakeImage.broken = true;
    await expect(measureFile(file('odd.png', 'image/png'))).resolves.toEqual({ width: 0, height: 0 });
    fakeVideo.broken = true;
    await expect(measureFile(file('odd.mov', 'video/quicktime'))).resolves.toEqual({ width: 0, height: 0 });
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('does not measure what is neither a picture nor a clip', async () => {
    await expect(measureFile(file('notes.pdf', 'application/pdf'))).resolves.toEqual({ width: 0, height: 0 });
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
