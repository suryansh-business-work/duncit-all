import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import useMediaPicker from '../../src/shared/useMediaPicker';

/**
 * The bridge between the URL-callback media dialog and a form's promise picker.
 *
 * The behaviour that matters is that the FOLDER travels with the request — a
 * club's moments must not land in `/clubs`, and a venue's documents must not land
 * in its gallery — and that a cancelled dialog resolves rather than leaving the
 * caller's `await` hanging forever.
 */
type Picker = ReturnType<typeof useMediaPicker>;

function mountPicker(defaultFolder: string) {
  const seen: Picker[] = [];
  function Probe() {
    seen.push(useMediaPicker(defaultFolder));
    return null;
  }
  render(<Probe />);
  return { latest: () => seen[seen.length - 1] };
}

describe('useMediaPicker', () => {
  it('starts closed on the default folder', () => {
    const { latest } = mountPicker('/venues');
    expect(latest().open).toBe(false);
    expect(latest().folder).toBe('/venues');
  });

  it('opens on the requested folder and resolves with the picked url', async () => {
    const { latest } = mountPicker('/venues');
    let picked: Promise<string | null> | undefined;

    act(() => {
      picked = latest().pickImage('/venue-documents');
    });
    expect(latest().open).toBe(true);
    expect(latest().folder).toBe('/venue-documents');

    act(() => latest().settle('https://ik.imagekit.io/d/gst.pdf'));
    await expect(picked).resolves.toBe('https://ik.imagekit.io/d/gst.pdf');
    expect(latest().open).toBe(false);
  });

  it('falls back to the default folder when the caller names none', () => {
    const { latest } = mountPicker('/hosts');
    act(() => {
      latest().pickImage();
    });
    expect(latest().folder).toBe('/hosts');
  });

  it('resolves null when the dialog is cancelled, never hangs', async () => {
    const { latest } = mountPicker('/clubs');
    let picked: Promise<string | null> | undefined;
    act(() => {
      picked = latest().pickImage();
    });
    act(() => latest().settle(null));
    await expect(picked).resolves.toBeNull();
  });

  it('settling twice does not throw — the second call has nobody to resolve', () => {
    const { latest } = mountPicker('/clubs');
    act(() => {
      latest().pickImage().catch(() => undefined);
    });
    act(() => latest().settle('https://x/a.jpg'));
    expect(() => act(() => latest().settle('https://x/b.jpg'))).not.toThrow();
  });
});
