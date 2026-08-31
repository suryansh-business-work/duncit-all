/**
 * The device tab's other halves: the video shapes, the two click-throughs to
 * the hidden input, the crop preset actually being chosen, and the dimension
 * probe reporting what the browser read off the file.
 *
 * jsdom never loads media, so `Image` and the probe `<video>` are stubbed to
 * fire their load events with known numbers — what is under test is that the
 * hook reports THOSE numbers, not zeros and not the previous file's.
 */
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import DeviceUploadTab from '../src/DeviceUploadTab';
import ImageCropStep from '../src/ImageCropStep';
import { useMediaDimensions } from '../src/FileDetails';
import type { UploadCropPreset } from '../src/types';

const testTheme = createTheme();

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  globalThis.URL.createObjectURL ??= () => 'blob:preview';
  globalThis.URL.revokeObjectURL ??= () => undefined;
});

const wrap = (ui: React.ReactNode) =>
  render(
    <MockedProvider mocks={[]}>
      <ThemeProvider theme={testTheme}>{ui}</ThemeProvider>
    </MockedProvider>
  );

const PRESETS: UploadCropPreset[] = [
  { key: 'NO_CROP', label: 'No crop', width: 0, height: 0, enabled: true },
  { key: 'COVER', label: 'Cover 16:9', width: 1600, height: 900, enabled: true },
  { key: 'SQUARE', label: 'Square', width: 1080, height: 1080, enabled: true },
];

const pngFile = () => new File([new Uint8Array([1, 2, 3])], 'court.png', { type: 'image/png' });
const mp4File = () => new File([new Uint8Array([9, 9])], 'reel.mp4', { type: 'video/mp4' });

const tab = (over: Partial<Parameters<typeof DeviceUploadTab>[0]> = {}) =>
  wrap(
    <DeviceUploadTab
      accept="image/*"
      fileInputRef={createRef<HTMLInputElement>()}
      picked={null}
      previewUrl={null}
      uploadPct={null}
      uploading={false}
      stage="uploading"
      settings={null}
      cropKey="NO_CROP"
      onSelectCropKey={vi.fn()}
      onCropComplete={vi.fn()}
      onPickFile={vi.fn()}
      {...over}
    />
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DeviceUploadTab', () => {
  it('invites a video, not an image, when the accept list is video-only', () => {
    const { container } = tab({ accept: 'video/*' });

    expect(container.textContent).toContain('Click to choose a video');
    expect(container.textContent).not.toContain('Click to choose an image');
  });

  it('previews a picked video as a playable element', () => {
    const { container } = tab({ picked: mp4File(), previewUrl: 'blob:preview' });

    expect(container.querySelector('video')).not.toBeNull();
  });

  it('shows an honest indeterminate bar when no percentage exists, with no fabricated %', () => {
    const { container } = tab({ picked: pngFile(), uploading: true, uploadPct: null, stage: 'processing' });

    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(container.textContent).not.toContain('%');
  });

  it('opens the hidden input from the drop zone and from the Change button', () => {
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const empty = tab();
    fireEvent.click(empty.getByText('Click to choose an image'));
    expect(click).toHaveBeenCalledTimes(1);

    const withFile = tab({ picked: pngFile(), previewUrl: 'blob:preview' });
    fireEvent.click(withFile.getByRole('button', { name: 'Change' }));
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('still offers the crop step before the admin settings arrive, on an empty preset list', () => {
    class LoadedImage {
      onload: (() => void) | null = null;
      naturalWidth = 1600;
      naturalHeight = 900;
      set src(_v: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal('Image', LoadedImage as unknown as typeof Image);

    const { container } = tab({ picked: pngFile(), previewUrl: 'blob:preview', settings: null });

    expect(container.querySelector('[role="combobox"]')).not.toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('ImageCropStep interactions', () => {
  const step = (selectedKey = 'NO_CROP') => {
    const spies = { onSelectKey: vi.fn(), onCropComplete: vi.fn() };
    return {
      spies,
      ...wrap(
        <ImageCropStep
          previewUrl="blob:preview"
          presets={PRESETS}
          selectedKey={selectedKey}
          suggestedKey="COVER"
          {...spies}
        />
      ),
    };
  };

  it('reports a chosen resolution preset by key, keeping the crop rect flowing', () => {
    const { spies } = step();

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /Square/ }));

    expect(spies.onSelectKey).toHaveBeenCalledWith('SQUARE');
    expect(spies.onCropComplete).not.toHaveBeenCalledWith(null);
  });

  it('clears the crop rect when No Crop is chosen — a rect with no preset would still crop', () => {
    const { spies } = step('COVER');

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /No crop/ }));

    expect(spies.onSelectKey).toHaveBeenCalledWith('NO_CROP');
    expect(spies.onCropComplete).toHaveBeenCalledWith(null);
  });

  it('zooms through the slider', () => {
    const { container } = step('COVER');
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;

    fireEvent.change(slider, { target: { value: '2' } });

    expect(slider.value).toBe('2');
  });
});

describe('useMediaDimensions with loadable media', () => {
  it('reports the natural resolution once the image loads', () => {
    class LoadedImage {
      onload: (() => void) | null = null;
      naturalWidth = 1600;
      naturalHeight = 900;
      set src(_v: string) {
        this.onload?.();
      }
    }
    vi.stubGlobal('Image', LoadedImage as unknown as typeof Image);

    const { result } = renderHook(() => useMediaDimensions('blob:preview', 'image'));

    expect(result.current).toEqual({ width: 1600, height: 900 });
    vi.unstubAllGlobals();
  });

  it('reports resolution AND duration for a video', () => {
    class FakeVideo {
      preload = '';
      onloadedmetadata: (() => void) | null = null;
      videoWidth = 1920;
      videoHeight = 1080;
      duration = 12;
      set src(_v: string) {
        this.onloadedmetadata?.();
      }
    }
    const original = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string, options?: ElementCreationOptions) => {
      if (tag === 'video') return new FakeVideo() as unknown as HTMLElement;
      return original(tag, options);
    }) as typeof document.createElement);

    const { result } = renderHook(() => useMediaDimensions('blob:preview', 'video'));

    expect(result.current).toEqual({ width: 1920, height: 1080, duration: 12 });
  });
});
