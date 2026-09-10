import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useClubImagePicker from '../useClubImagePicker';

describe('useClubImagePicker', () => {
  it('starts closed, with the /clubs default folder', () => {
    const { result } = renderHook(() => useClubImagePicker());
    expect(result.current.open).toBe(false);
    expect(result.current.folder).toBe('/clubs');
  });

  it('opens with the default folder when pickImage is called with no argument', () => {
    const { result } = renderHook(() => useClubImagePicker());
    act(() => {
      result.current.pickImage();
    });
    expect(result.current.open).toBe(true);
    expect(result.current.folder).toBe('/clubs');
  });

  it('opens with the given folder when pickImage names one (club moments never land in /clubs)', () => {
    const { result } = renderHook(() => useClubImagePicker());
    act(() => {
      result.current.pickImage('/clubs/moments');
    });
    expect(result.current.open).toBe(true);
    expect(result.current.folder).toBe('/clubs/moments');
  });

  it('resolves the pickImage promise with the picked url and closes', async () => {
    const { result } = renderHook(() => useClubImagePicker());
    let pending: Promise<string | null> | null = null;
    act(() => {
      pending = result.current.pickImage();
    });
    expect(result.current.open).toBe(true);

    act(() => {
      result.current.settle('https://cdn.test/picked.jpg');
    });
    expect(result.current.open).toBe(false);
    await expect(pending).resolves.toBe('https://cdn.test/picked.jpg');
  });

  it('resolves the pickImage promise with null when the picker is closed without picking', async () => {
    const { result } = renderHook(() => useClubImagePicker());
    let pending: Promise<string | null> | null = null;
    act(() => {
      pending = result.current.pickImage();
    });

    act(() => {
      result.current.settle(null);
    });
    expect(result.current.open).toBe(false);
    await expect(pending).resolves.toBeNull();
  });

  it('a second settle with no pending request is a safe no-op', () => {
    const { result } = renderHook(() => useClubImagePicker());
    act(() => {
      result.current.settle('https://cdn.test/ignored.jpg');
    });
    // Nothing was pending (resolveRef was already null), so this must not throw
    // and the picker stays closed.
    expect(() =>
      act(() => {
        result.current.settle(null);
      }),
    ).not.toThrow();
    expect(result.current.open).toBe(false);
  });

  it('a fresh pickImage after a settle starts a new independent promise', async () => {
    const { result } = renderHook(() => useClubImagePicker());
    let first: Promise<string | null> | null = null;
    act(() => {
      first = result.current.pickImage();
    });
    act(() => {
      result.current.settle('https://cdn.test/first.jpg');
    });
    await expect(first).resolves.toBe('https://cdn.test/first.jpg');

    let second: Promise<string | null> | null = null;
    act(() => {
      second = result.current.pickImage('/clubs/cover');
    });
    expect(result.current.folder).toBe('/clubs/cover');
    act(() => {
      result.current.settle('https://cdn.test/second.jpg');
    });
    await expect(second).resolves.toBe('https://cdn.test/second.jpg');
  });
});
