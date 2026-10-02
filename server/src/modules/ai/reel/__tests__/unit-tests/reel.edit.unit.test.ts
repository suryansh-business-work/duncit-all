import type { ReelAsset } from '../../reel.model';
import { REEL_LIMITS, emptySpec, sanitizeSpec, specDurationMs } from '../../reel.edit';

const asset = (id: string, kind: ReelAsset['kind'], duration_ms = 0): ReelAsset => ({
  id,
  kind,
  source: 'DRIVE',
  name: `${id}.bin`,
  mime_type: '',
  drive_file_id: `drive-${id}`,
  url: '',
  duration_ms,
  width: 1080,
  height: 1920,
  size_bytes: 1,
  added_at: new Date('2026-10-01T00:00:00Z'),
});

const ASSETS = [
  asset('clip', 'VIDEO', 10_000),
  asset('raw', 'VIDEO'),
  asset('logo', 'IMAGE'),
  asset('song', 'AUDIO', 30_000),
  asset('hum', 'AUDIO'),
];

const one = (scene: Record<string, unknown>) => sanitizeSpec({ scenes: [scene] }, ASSETS).scenes[0];

describe('emptySpec', () => {
  it('is a portrait reel with nothing in it', () => {
    expect(emptySpec()).toEqual({ fps: 30, width: 1080, height: 1920, background: '#000000', scenes: [], music: null });
  });
});

describe('sanitizeSpec — what it refuses', () => {
  it.each([null, undefined, 'a reel', 7, ['scene']])('reads %p as an empty reel', (raw) => {
    expect(sanitizeSpec(raw, ASSETS)).toEqual(emptySpec());
  });

  it('treats scenes that are not a list as none', () => {
    expect(sanitizeSpec({ scenes: 'three' }, ASSETS).scenes).toEqual([]);
  });

  it('drops a scene that is not an object, names unknown footage, or names a sound file', () => {
    const spec = sanitizeSpec(
      { scenes: ['card', null, { asset_id: 'missing' }, { asset_id: 'song' }, { asset_id: 'logo' }] },
      ASSETS
    );
    expect(spec.scenes.map((scene) => scene.asset_id)).toEqual(['logo']);
  });

  it('keeps at most the allowed number of scenes', () => {
    const scenes = Array.from({ length: REEL_LIMITS.maxScenes + 5 }, () => ({ duration_ms: 500 }));
    expect(sanitizeSpec({ scenes }, ASSETS).scenes).toHaveLength(REEL_LIMITS.maxScenes);
  });

  it('stops at the scene that would take the reel past its longest length', () => {
    const scenes = Array.from({ length: 4 }, () => ({ duration_ms: 60_000 }));
    const spec = sanitizeSpec({ scenes }, ASSETS);
    expect(spec.scenes).toHaveLength(3);
    expect(specDurationMs(spec)).toBe(REEL_LIMITS.maxTotalMs);
  });
});

describe('sanitizeSpec — a scene', () => {
  it('fills a colour card with defaults', () => {
    expect(one({})).toMatchObject({
      asset_id: '',
      duration_ms: 3000,
      trim_start_ms: 0,
      playback_rate: 1,
      volume: 0,
      fit: 'COVER',
      motion: 'NONE',
      transition: 'NONE',
      transition_ms: 0,
      background: '#000000',
      texts: [],
      overlays: [],
    });
  });

  it('gives a picture no trim, rate or sound, whatever was asked', () => {
    expect(one({ asset_id: 'logo', trim_start_ms: 900, playback_rate: 2, volume: 1 })).toMatchObject({
      trim_start_ms: 0,
      playback_rate: 1,
      volume: 0,
    });
  });

  it('cuts a video inside the clip it comes from', () => {
    // 10s clip, start at 4s, double speed: 3s of screen time is all that is left.
    expect(one({ asset_id: 'clip', trim_start_ms: 4000, playback_rate: 2, duration_ms: 9000, volume: 0.5 })).toMatchObject({
      trim_start_ms: 4000,
      playback_rate: 2,
      volume: 0.5,
      duration_ms: 3000,
    });
  });

  it('never trims past the last half second of a clip', () => {
    expect(one({ asset_id: 'clip', trim_start_ms: 99_000 })).toMatchObject({ trim_start_ms: 9500, duration_ms: 500 });
  });

  it('takes the trim on trust while Drive has not measured the clip', () => {
    expect(one({ asset_id: 'raw', trim_start_ms: 70_000, duration_ms: 90_000 })).toMatchObject({
      trim_start_ms: 70_000,
      duration_ms: REEL_LIMITS.maxSceneMs,
    });
  });

  it('clamps numbers, reads numeric strings, and falls back on anything else', () => {
    expect(one({ duration_ms: 10 }).duration_ms).toBe(REEL_LIMITS.minSceneMs);
    expect(one({ duration_ms: '4200.4' }).duration_ms).toBe(4200);
    expect(one({ duration_ms: 'long' }).duration_ms).toBe(3000);
    expect(one({ asset_id: 'clip', volume: null }).volume).toBe(1);
    expect(one({ asset_id: 'clip', volume: true }).volume).toBe(1);
    expect(one({ asset_id: 'clip', playback_rate: 9 }).playback_rate).toBe(4);
  });

  it('accepts a known option in any case and replaces an unknown one', () => {
    expect(one({ fit: ' contain ', motion: 'zoom_in', background: '#a1b2c3' })).toMatchObject({
      fit: 'CONTAIN',
      motion: 'ZOOM_IN',
      background: '#A1B2C3',
    });
    expect(one({ fit: 5, motion: 'SPIN', background: 'red' })).toMatchObject({
      fit: 'COVER',
      motion: 'NONE',
      background: '#000000',
    });
    expect(one({ fit: {} }).fit).toBe('COVER');
  });

  it('keeps a usable id, and mints a new one for a missing or repeated id', () => {
    const spec = sanitizeSpec({ scenes: [{ id: 'intro' }, { id: 'intro' }, {}] }, ASSETS);
    const [first, second, third] = spec.scenes.map((scene) => scene.id);
    expect(first).toBe('intro');
    expect(second).toMatch(/^[\da-f-]{8}$/);
    expect(third).toMatch(/^[\da-f-]{8}$/);
    expect(new Set([first, second, third]).size).toBe(3);
  });
});

describe('sanitizeSpec — texts and overlays', () => {
  it('drops a text that is not an object or has no words', () => {
    expect(one({ texts: ['hello', { text: '   ' }, { text: 7 }] }).texts.map((text) => text.text)).toEqual(['7']);
  });

  it('fills a text with defaults and trims it to the longest length', () => {
    const [text] = one({ texts: [{ text: 'x'.repeat(400) }] }).texts;
    expect(text).toMatchObject({
      position: 'BOTTOM',
      style: 'CAPTION',
      animation: 'FADE',
      start_ms: 0,
      duration_ms: 0,
      color: '#FFFFFF',
      background: '',
    });
    expect(text.text).toHaveLength(REEL_LIMITS.maxTextLength);
  });

  it('keeps a text inside its scene', () => {
    const texts = one({
      duration_ms: 2000,
      texts: [
        { text: 'late', start_ms: 5000, duration_ms: 5000 },
        { text: 'blink', start_ms: 100, duration_ms: 50 },
      ],
    }).texts;
    // Starts no later than 200ms before the end, and then fills what is left.
    expect(texts[0]).toMatchObject({ start_ms: 1800, duration_ms: 200 });
    // Too short to read: stretched to the minimum.
    expect(texts[1]).toMatchObject({ start_ms: 100, duration_ms: 200 });
  });

  it('keeps at most the allowed number of texts and overlays', () => {
    const scene = one({
      texts: Array.from({ length: 9 }, (_item, index) => ({ text: `line ${index}` })),
      overlays: Array.from({ length: 9 }, () => ({ asset_id: 'logo' })),
    });
    expect(scene.texts).toHaveLength(REEL_LIMITS.maxTexts);
    expect(scene.overlays).toHaveLength(REEL_LIMITS.maxOverlays);
  });

  it('lets only a picture sit on top of a scene', () => {
    const overlays = one({
      overlays: ['logo', { asset_id: 'clip' }, { asset_id: 'logo', corner: 'center', width_pct: 400, opacity: 0 }, { asset_id: 'logo' }],
    }).overlays;
    expect(overlays).toHaveLength(2);
    expect(overlays[0]).toMatchObject({ asset_id: 'logo', corner: 'CENTER', width_pct: 100, opacity: 0.1 });
    expect(overlays[1]).toMatchObject({ corner: 'TOP_RIGHT', width_pct: 22, opacity: 1, start_ms: 0, duration_ms: 0 });
  });
});

describe('sanitizeSpec — transitions, music and background', () => {
  it('gives the first scene no way in, and caps an overlap at half the shorter neighbour', () => {
    const spec = sanitizeSpec(
      {
        scenes: [
          { duration_ms: 4000, transition: 'FADE' },
          { duration_ms: 4000, transition: 'SLIDE' },
          { duration_ms: 600, transition: 'WIPE' },
          { duration_ms: 4000 },
        ],
      },
      ASSETS
    );
    expect(spec.scenes.map((scene) => [scene.transition, scene.transition_ms])).toEqual([
      ['NONE', 0],
      ['SLIDE', REEL_LIMITS.transitionMs],
      ['WIPE', 300],
      ['NONE', 0],
    ]);
    expect(specDurationMs(spec)).toBe(4000 + 4000 + 600 + 4000 - REEL_LIMITS.transitionMs - 300);
  });

  it('plays only a sound file as music', () => {
    expect(sanitizeSpec({ music: 'song' }, ASSETS).music).toBeNull();
    expect(sanitizeSpec({ music: { asset_id: 'clip' } }, ASSETS).music).toBeNull();
    expect(sanitizeSpec({ music: { asset_id: 'song', trim_start_ms: 99_000 } }, ASSETS).music).toEqual({
      asset_id: 'song',
      volume: 0.6,
      trim_start_ms: 29_500,
    });
    // Length unknown: there is nowhere safe to trim to.
    expect(sanitizeSpec({ music: { asset_id: 'hum', volume: 2, trim_start_ms: 4000 } }, ASSETS).music).toEqual({
      asset_id: 'hum',
      volume: 1,
      trim_start_ms: 0,
    });
  });

  it('keeps a valid background and replaces anything else', () => {
    expect(sanitizeSpec({ background: '#0f0f0f' }, ASSETS).background).toBe('#0F0F0F');
    expect(sanitizeSpec({ background: 'black' }, ASSETS).background).toBe('#000000');
  });
});
