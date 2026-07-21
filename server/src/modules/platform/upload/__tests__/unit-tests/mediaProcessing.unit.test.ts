import sharp from 'sharp';
import { getUploadSettingsSafe, isProcessableImage, processImageBytes } from '../../mediaProcessing';

const setting = (over: Record<string, unknown> = {}) =>
  ({
    image_compression_enabled: true,
    image_quality: 80,
    image_max_dimension: 1920,
    crop_presets: [
      { key: 'NO_CROP', label: 'No Crop', width: 0, height: 0, enabled: true },
      { key: 'POD_MOMENT', label: 'Pod Moment', width: 40, height: 40, enabled: true },
      { key: 'DISABLED', label: 'Off', width: 40, height: 40, enabled: false },
    ],
    ...over,
  }) as any;

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .png()
    .toBuffer();

describe('mediaProcessing', () => {
  it('classifies processable raster formats only', () => {
    expect(isProcessableImage('image/jpeg')).toBe(true);
    expect(isProcessableImage('image/png')).toBe(true);
    expect(isProcessableImage('image/webp')).toBe(true);
    expect(isProcessableImage('image/gif')).toBe(false);
    expect(isProcessableImage('image/svg+xml')).toBe(false);
  });

  it('returns settings null without a DB connection (unit context)', async () => {
    expect(await getUploadSettingsSafe('PORTALS')).toBeNull();
  });

  it('passes GIFs through untouched and skips work when nothing is enabled', async () => {
    const gifBytes = Buffer.from('GIF89a-fake');
    expect(
      await processImageBytes({ fileBytes: gifBytes, mimeType: 'image/gif', setting: setting() }),
    ).toBe(gifBytes);

    const source = await png(100, 50);
    const out = await processImageBytes({
      fileBytes: source,
      mimeType: 'image/png',
      setting: setting({ image_compression_enabled: false }),
    });
    expect(out).toBe(source);
  });

  it('caps the longest edge at image_max_dimension when compressing', async () => {
    const out = await processImageBytes({
      fileBytes: await png(100, 50),
      mimeType: 'image/png',
      setting: setting({ image_max_dimension: 320 }),
    });
    // withoutEnlargement: a 100×50 source stays 100×50 under a 320 cap…
    const small = await sharp(out).metadata();
    expect([small.width, small.height]).toEqual([100, 50]);

    const shrunk = await processImageBytes({
      fileBytes: await png(1000, 500),
      mimeType: 'image/png',
      setting: setting({ image_max_dimension: 320 }),
    });
    // …while a 1000×500 source shrinks to fit inside 320×320.
    const meta = await sharp(shrunk).metadata();
    expect([meta.width, meta.height]).toEqual([320, 160]);
  });

  it('applies the user crop rect (clamped to the source bounds)', async () => {
    const out = await processImageBytes({
      fileBytes: await png(100, 100),
      mimeType: 'image/png',
      setting: setting({ image_compression_enabled: false }),
      crop: { x: 10, y: 10, width: 500, height: 30 },
    });
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([90, 30]);
  });

  it('resizes to an enabled crop preset and ignores disabled ones', async () => {
    const out = await processImageBytes({
      fileBytes: await png(200, 100),
      mimeType: 'image/png',
      setting: setting(),
      cropPresetKey: 'POD_MOMENT',
    });
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([40, 40]);

    const ignored = await processImageBytes({
      fileBytes: await png(200, 100),
      mimeType: 'image/png',
      setting: setting({ image_max_dimension: 320 }),
      cropPresetKey: 'DISABLED',
    });
    const fallbackMeta = await sharp(ignored).metadata();
    expect(fallbackMeta.width).toBe(200);
  });

  it('re-encodes to JPEG when forceJpeg is set (disallowed format upload)', async () => {
    const out = await processImageBytes({
      fileBytes: await png(50, 50),
      mimeType: 'image/png',
      setting: setting({ image_compression_enabled: false }),
      forceJpeg: true,
    });
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('jpeg');
  });
});
