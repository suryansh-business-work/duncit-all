import {
  aspectCropRect,
  presetAspect,
  previewBoxSize,
  suggestPresetKey,
  MAX_ZOOM,
} from '@/components/media-crop/cropRect';

const preset = (key: string, width: number, height: number, enabled = true) => ({
  key,
  width,
  height,
  enabled,
});

describe('presetAspect', () => {
  it('returns w/h for a real preset and 1 when the height is missing', () => {
    expect(presetAspect(1920, 1080)).toBeCloseTo(16 / 9);
    expect(presetAspect(1000, 0)).toBe(1);
  });
});

describe('aspectCropRect', () => {
  it('centres a 16:9 crop limited by height on a wider (2:1) source at zoom 1', () => {
    const rect = aspectCropRect(4000, 2000, 16, 9, 1);
    // source aspect 2 > 16/9 → limited by height: height stays 2000, width = 2000*16/9
    expect(rect).toEqual({ x: 222, y: 0, width: 3556, height: 2000 });
  });

  it('centres a crop limited by width when the source is taller than the target', () => {
    const rect = aspectCropRect(1000, 3000, 16, 9, 1);
    // source aspect 0.33 < 16/9 → limited by width: width 1000, height = 1000*9/16 = 562.5
    expect(rect).toEqual({ x: 0, y: 1219, width: 1000, height: 563 });
  });

  it('tightens and re-centres the crop as zoom increases', () => {
    const rect = aspectCropRect(1000, 1000, 1, 1, 2);
    expect(rect).toEqual({ x: 250, y: 250, width: 500, height: 500 });
  });

  it('clamps zoom to the MAX_ZOOM bound', () => {
    const atMax = aspectCropRect(1200, 1200, 1, 1, MAX_ZOOM);
    const overMax = aspectCropRect(1200, 1200, 1, 1, MAX_ZOOM + 5);
    expect(overMax).toEqual(atMax);
  });

  it('falls back to the whole frame for a degenerate source or aspect', () => {
    expect(aspectCropRect(0, 0, 1, 1, 1)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(aspectCropRect(800, 600, 0, 9, 1)).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });
});

describe('previewBoxSize', () => {
  it('fills the width for landscape/square and the height for portrait', () => {
    expect(previewBoxSize(16 / 9, 320)).toEqual({ width: 320, height: 180 });
    expect(previewBoxSize(1, 300)).toEqual({ width: 300, height: 300 });
    expect(previewBoxSize(9 / 16, 320)).toEqual({ width: 180, height: 320 });
  });

  it('falls back to a square for a degenerate aspect', () => {
    expect(previewBoxSize(0, 250)).toEqual({ width: 250, height: 250 });
  });
});

describe('suggestPresetKey', () => {
  const presets = [
    preset('RATIO_16_9', 1920, 1080),
    preset('VERTICAL_9_16', 1080, 1920),
    preset('POD_MOMENT', 1080, 1080),
    preset('DISABLED', 100, 100, false),
    preset('NO_CROP', 0, 0),
  ];

  it('picks the croppable preset whose aspect is closest to the source', () => {
    expect(suggestPresetKey(1920, 1080, presets)).toBe('RATIO_16_9');
    expect(suggestPresetKey(1080, 1920, presets)).toBe('VERTICAL_9_16');
    expect(suggestPresetKey(500, 500, presets)).toBe('POD_MOMENT');
  });

  it('returns null when the size is unknown or there is no croppable preset', () => {
    expect(suggestPresetKey(0, 100, presets)).toBeNull();
    expect(suggestPresetKey(100, 100, [preset('NO_CROP', 0, 0)])).toBeNull();
  });
});
