import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { IMAGE_SIZE_TIMEOUT_MS, readImageSize, useImageUploads } from '@/lib/useImageUploads';

const { upload, MB } = vi.hoisted(() => ({ upload: vi.fn(), MB: 1024 * 1024 }));

// ImageKit is the boundary: the test decides what each upload returns. Images are capped at 5 MB.
vi.mock('@duncit/media-picker', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/media-picker')>()),
  useImagekitBase64Upload: () => ({ upload, uploading: false }),
  useUploadCaps: () => ({ maxImageBytes: 5 * MB }),
}));

const file = (name: string, type: string, size = 100) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

type ImageOutcome = { load: true; width: number; height: number } | { load: false };
let outcome: ImageOutcome = { load: false };

/** A stand-in for the browser's Image: "decodes" to the size the test sets, or fails. */
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;

  set src(_value: string) {
    queueMicrotask(() => {
      if (outcome.load) {
        this.naturalWidth = outcome.width;
        this.naturalHeight = outcome.height;
        this.onload?.();
      } else {
        this.onerror?.();
      }
    });
  }
}

const savedCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const savedRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
const createObjectURL = vi.fn(() => 'blob:preview');
const revokeObjectURL = vi.fn();

const withObjectUrls = () => {
  Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true, writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true, writable: true });
  vi.stubGlobal('Image', FakeImage);
};

const restore = (key: 'createObjectURL' | 'revokeObjectURL', saved: PropertyDescriptor | undefined) => {
  if (saved) Object.defineProperty(URL, key, saved);
  else delete (URL as unknown as Record<string, unknown>)[key];
};

beforeEach(() => {
  upload.mockReset();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  outcome = { load: false };
});

afterEach(() => {
  vi.unstubAllGlobals();
  restore('createObjectURL', savedCreate);
  restore('revokeObjectURL', savedRevoke);
});

/** An Image that never answers — what an environment that cannot decode images does. */
class SilentImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(_value: string) {
    // Neither load nor error ever fires.
  }
}

describe('readImageSize', () => {
  it('gives up after the timeout with an unknown size, frees the URL, and ignores a late answer', async () => {
    vi.useFakeTimers();
    try {
      Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true, writable: true });
      Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true, writable: true });
      vi.stubGlobal('Image', SilentImage);
      let result: unknown = 'pending';
      const pending = readImageSize(file('logo.png', 'image/png')).then((size) => {
        result = size;
      });

      await vi.advanceTimersByTimeAsync(IMAGE_SIZE_TIMEOUT_MS - 1);
      expect(result).toBe('pending');
      await vi.advanceTimersByTimeAsync(1);
      await pending;
      expect(result).toEqual({ width: null, height: null });
      expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reads the natural size and frees the object URL', async () => {
    withObjectUrls();
    outcome = { load: true, width: 1200, height: 400 };

    await expect(readImageSize(file('banner.png', 'image/png'))).resolves.toEqual({ width: 1200, height: 400 });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('gives nulls when the browser reports no size, as for some SVGs', async () => {
    withObjectUrls();
    outcome = { load: true, width: 0, height: 0 };
    await expect(readImageSize(file('logo.svg', 'image/svg+xml'))).resolves.toEqual({ width: null, height: null });
  });

  it('gives nulls when the image cannot be decoded, and still frees the URL', async () => {
    withObjectUrls();
    await expect(readImageSize(file('broken.png', 'image/png'))).resolves.toEqual({ width: null, height: null });
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('gives nulls without object URLs', async () => {
    Object.defineProperty(URL, 'createObjectURL', { value: undefined, configurable: true, writable: true });
    await expect(readImageSize(file('a.png', 'image/png'))).resolves.toEqual({ width: null, height: null });
  });
});

describe('useImageUploads', () => {
  const options = { folder: 'crm/leads/venue_lead', accept: ['image/png', 'image/jpeg'], entityId: 'venue-1' };

  it('does nothing for an empty pick', async () => {
    const { result } = renderHook(() => useImageUploads(options));
    let uploaded: unknown;
    await act(async () => {
      uploaded = await result.current.uploadFiles(null);
    });
    expect(uploaded).toEqual([]);
    await act(async () => {
      uploaded = await result.current.uploadFiles([]);
    });
    expect(uploaded).toEqual([]);
    expect(upload).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual([]);
  });

  it('uploads accepted files with their type, size and dimensions, and names every refused one', async () => {
    withObjectUrls();
    outcome = { load: true, width: 800, height: 600 };
    upload.mockImplementation(async (f: File) => {
      if (f.name === 'flaky.jpg') throw new Error('Upload timed out');
      return { url: `https://ik.imagekit.io/duncit/${f.name}` };
    });
    const { result } = renderHook(() => useImageUploads(options));

    let uploaded: unknown;
    await act(async () => {
      uploaded = await result.current.uploadFiles([
        file('hall.png', 'image/png', 2048),
        file('menu.pdf', 'application/pdf'),
        file('huge.jpg', 'image/jpeg', 5 * MB + 1),
        file('flaky.jpg', 'image/jpeg'),
        file('stage.jpg', 'image/jpeg', 5 * MB),
      ]);
    });

    expect(uploaded).toEqual([
      { url: 'https://ik.imagekit.io/duncit/hall.png', name: 'hall.png', mime_type: 'image/png', size_bytes: 2048, width: 800, height: 600 },
      { url: 'https://ik.imagekit.io/duncit/stage.jpg', name: 'stage.jpg', mime_type: 'image/jpeg', size_bytes: 5 * MB, width: 800, height: 600 },
    ]);
    expect(result.current.errors).toEqual([
      'menu.pdf: this file type is not supported here.',
      'huge.jpg is over 5 MB. Compress it and try again.',
      'flaky.jpg: Upload timed out',
    ]);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ name: 'hall.png' }), {
      folder: 'crm/leads/venue_lead',
      entityId: 'venue-1',
      fallbackMimeType: 'image/png',
    });
    expect(result.current.busy).toBe(false);
  });

  it('is busy while uploading and clears the last errors on the next pick', async () => {
    // No object URLs: dimensions resolve straight away as unknown, so only the upload is pending.
    Object.defineProperty(URL, 'createObjectURL', { value: undefined, configurable: true, writable: true });
    let finish: (value: { url: string }) => void = () => undefined;
    upload.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const { result } = renderHook(() => useImageUploads(options));

    act(() => {
      result.current.setErrors(['old problem']);
    });
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.uploadFiles([file('a.png', 'image/png')]);
    });
    await waitFor(() => expect(result.current.busy).toBe(true));
    expect(upload).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish({ url: 'https://ik.imagekit.io/duncit/a.png' });
      await pending;
    });
    expect(result.current.busy).toBe(false);
    expect(result.current.errors).toEqual([]);
  });
});
