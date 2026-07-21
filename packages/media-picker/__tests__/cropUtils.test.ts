import { describe, expect, it } from 'vitest';
import {
  croppablePresets,
  formatBytes,
  formatDuration,
  presetAspect,
  suggestPresetKey,
} from '../src/cropUtils';
import type { UploadCropPreset } from '../src/types';

const preset = (key: string, width: number, height: number, enabled = true): UploadCropPreset => ({
  key,
  label: key,
  width,
  height,
  enabled,
});

const PRESETS = [
  preset('NO_CROP', 0, 0),
  preset('RATIO_16_9', 1920, 1080),
  preset('VERTICAL_9_16', 1080, 1920),
  preset('POD_MOMENT', 1080, 1080),
  preset('DISABLED_WIDE', 4000, 1000, false),
];

describe('croppablePresets / presetAspect', () => {
  it('keeps only enabled presets with a real target resolution', () => {
    expect(croppablePresets(PRESETS).map((p) => p.key)).toEqual([
      'RATIO_16_9',
      'VERTICAL_9_16',
      'POD_MOMENT',
    ]);
  });

  it('computes the aspect ratio (1 for degenerate heights)', () => {
    expect(presetAspect(preset('X', 1920, 1080))).toBeCloseTo(16 / 9);
    expect(presetAspect(preset('X', 100, 0))).toBe(1);
  });
});

describe('suggestPresetKey', () => {
  it('suggests the enabled preset closest to the source aspect', () => {
    expect(suggestPresetKey(3840, 2160, PRESETS)).toBe('RATIO_16_9');
    expect(suggestPresetKey(720, 1280, PRESETS)).toBe('VERTICAL_9_16');
    expect(suggestPresetKey(1000, 1000, PRESETS)).toBe('POD_MOMENT');
  });

  it('never suggests disabled or 0×0 presets', () => {
    expect(suggestPresetKey(4000, 1000, PRESETS)).toBe('RATIO_16_9');
  });

  it('returns null without source dims or croppable presets', () => {
    expect(suggestPresetKey(0, 100, PRESETS)).toBeNull();
    expect(suggestPresetKey(100, 100, [preset('NO_CROP', 0, 0)])).toBeNull();
  });
});

describe('formatBytes / formatDuration', () => {
  it('formats sizes in B / KB / MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024 * 648)).toBe('648 KB');
    expect(formatBytes(12.4 * 1024 * 1024)).toBe('12.4 MB');
  });

  it('formats durations as m:ss and hides invalid ones', () => {
    expect(formatDuration(75)).toBe('1:15');
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(0)).toBe('');
    expect(formatDuration(Number.NaN)).toBe('');
  });
});
