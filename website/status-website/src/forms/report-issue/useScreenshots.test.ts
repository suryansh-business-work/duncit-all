/**
 * The screenshots a reporter attaches.
 *
 * They are read into base64 in the browser and travel inside the mutation:
 * this form has no session behind it, and handing an anonymous visitor an
 * upload credential is a far bigger door than it needs open. So the limits
 * here are the only ones applied before the server sees them, and each of the
 * three ways a file is turned away has to say which one it was — "nothing
 * happened" is the worst possible answer to a person already reporting a bug.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_SCREENSHOTS, MAX_SCREENSHOT_BYTES } from './report-issue.types';
import { useScreenshots } from './useScreenshots';

const t = (key: string) => key;

/** A File whose size is whatever the test needs it to be. */
const makeFile = (name: string, size = 1024, type = 'image/png'): File => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const asList = (...files: File[]) => files as unknown as FileList;

let uuid = 0;

beforeEach(() => {
  uuid = 0;
  vi.stubGlobal('crypto', {
    ...globalThis.crypto,
    randomUUID: () => {
      uuid += 1;
      return `shot-${uuid}`;
    },
  });
});

describe('useScreenshots', () => {
  it('starts empty and reads a picked file into a data URL', async () => {
    const { result } = renderHook(() => useScreenshots(t));
    expect(result.current.shots).toEqual([]);

    await act(async () => {
      await result.current.add(asList(makeFile('console.png')));
    });

    await waitFor(() => expect(result.current.shots).toHaveLength(1));
    expect(result.current.shots[0]).toMatchObject({
      id: 'shot-1',
      file_name: 'console.png',
      mime_type: 'image/png',
    });
    expect(result.current.shots[0]?.data).toMatch(/^data:/);
    expect(result.current.error).toBe('');
  });

  it('does nothing at all when the picker was cancelled', async () => {
    const { result } = renderHook(() => useScreenshots(t));

    await act(async () => {
      await result.current.add(null);
      await result.current.add(asList());
    });

    expect(result.current.shots).toEqual([]);
    expect(result.current.error).toBe('');
  });

  it('names a file the browser reported no type for as a PNG', async () => {
    const { result } = renderHook(() => useScreenshots(t));

    await act(async () => {
      await result.current.add(asList(makeFile('clipboard', 512, '')));
    });

    await waitFor(() => expect(result.current.shots).toHaveLength(1));
    expect(result.current.shots[0]?.mime_type).toBe('image/png');
  });

  it('turns away one that is too big, and keeps going through the rest', async () => {
    const { result } = renderHook(() => useScreenshots(t));

    await act(async () => {
      await result.current.add(
        asList(makeFile('huge.png', MAX_SCREENSHOT_BYTES + 1), makeFile('small.png')),
      );
    });

    await waitFor(() => expect(result.current.shots).toHaveLength(1));
    // The one that fits still lands — a rejected file must not cost the others.
    expect(result.current.shots[0]?.file_name).toBe('small.png');
    expect(result.current.error).toBe('status.report.screenshotTooLarge');
  });

  it('stops at the limit and says so', async () => {
    const { result } = renderHook(() => useScreenshots(t));
    const files = Array.from({ length: MAX_SCREENSHOTS + 1 }, (_, i) => makeFile(`s${i}.png`));

    await act(async () => {
      await result.current.add(asList(...files));
    });

    await waitFor(() => expect(result.current.shots).toHaveLength(MAX_SCREENSHOTS));
    expect(result.current.error).toBe('status.report.screenshotLimit');
  });

  it('counts what is already attached against the limit', async () => {
    const { result } = renderHook(() => useScreenshots(t));

    await act(async () => {
      await result.current.add(asList(...Array.from({ length: MAX_SCREENSHOTS }, (_, i) => makeFile(`a${i}.png`))));
    });
    await waitFor(() => expect(result.current.shots).toHaveLength(MAX_SCREENSHOTS));

    await act(async () => {
      await result.current.add(asList(makeFile('one-too-many.png')));
    });

    expect(result.current.shots).toHaveLength(MAX_SCREENSHOTS);
    expect(result.current.error).toBe('status.report.screenshotLimit');
  });

  it('says so when the browser cannot read the file at all', async () => {
    const failing = class {
      onerror: (() => void) | null = null;

      onload: (() => void) | null = null;

      result: string | null = null;

      readAsDataURL(): void {
        this.onerror?.();
      }
    };
    vi.stubGlobal('FileReader', failing);
    const { result } = renderHook(() => useScreenshots(t));

    await act(async () => {
      await result.current.add(asList(makeFile('locked.png')));
    });

    expect(result.current.shots).toEqual([]);
    expect(result.current.error).toBe('status.report.screenshotUnreadable');
    vi.unstubAllGlobals();
  });

  it('reads a result the browser handed back as something other than text as empty', async () => {
    const binary = class {
      onerror: (() => void) | null = null;

      onload: (() => void) | null = null;

      result: ArrayBuffer = new ArrayBuffer(2);

      readAsDataURL(): void {
        this.onload?.();
      }
    };
    vi.stubGlobal('FileReader', binary);
    const { result } = renderHook(() => useScreenshots(t));

    await act(async () => {
      await result.current.add(asList(makeFile('odd.png')));
    });

    await waitFor(() => expect(result.current.shots).toHaveLength(1));
    expect(result.current.shots[0]?.data).toBe('');
    vi.unstubAllGlobals();
  });

  it('removes one by id, and clears the error with it', async () => {
    const { result } = renderHook(() => useScreenshots(t));

    await act(async () => {
      await result.current.add(asList(makeFile('a.png'), makeFile('b.png')));
    });
    await waitFor(() => expect(result.current.shots).toHaveLength(2));

    act(() => {
      result.current.remove('shot-1');
    });

    expect(result.current.shots.map((shot) => shot.file_name)).toEqual(['b.png']);
    expect(result.current.error).toBe('');
  });

  it('clears the lot once the report has been sent', async () => {
    const { result } = renderHook(() => useScreenshots(t));

    await act(async () => {
      await result.current.add(asList(makeFile('a.png')));
    });
    await waitFor(() => expect(result.current.shots).toHaveLength(1));

    act(() => {
      result.current.clear();
    });

    expect(result.current.shots).toEqual([]);
    expect(result.current.error).toBe('');
  });
});
