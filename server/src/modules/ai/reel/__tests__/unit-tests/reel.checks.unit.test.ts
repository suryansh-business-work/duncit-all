import type { ReelAsset } from '../../reel.model';
import { REEL_LIMITS, emptySpec, type ReelScene, type ReelSpec, type ReelText } from '../../reel.edit';
import { REEL_PLATFORM_MAX_MS, reelChecks } from '../../reel.checks';

const asset = (id: string, kind: ReelAsset['kind'], name = `${id}.bin`): ReelAsset => ({
  id,
  kind,
  source: 'UPLOAD',
  name,
  mime_type: '',
  drive_file_id: '',
  url: `https://ik.imagekit.io/duncit/${id}`,
  duration_ms: 30_000,
  width: 1080,
  height: 1920,
  size_bytes: 1,
  licence: '',
  attribution: '',
  provider_id: '',
  added_at: new Date('2026-10-01T00:00:00Z'),
});

const ASSETS = [asset('clip', 'VIDEO'), asset('logo', 'IMAGE', 'logo.png'), asset('song', 'AUDIO')];

const text = (value: string, start_ms = 0): ReelText => ({
  id: `t-${value.slice(0, 4)}`,
  text: value,
  position: 'BOTTOM',
  style: 'TITLE',
  animation: 'NONE',
  start_ms,
  duration_ms: 0,
  color: '#FFFFFF',
  background: '',
});

const scene = (over: Partial<ReelScene>): ReelScene => ({
  id: 's',
  asset_id: '',
  duration_ms: 3000,
  trim_start_ms: 0,
  volume: 0,
  playback_rate: 1,
  fit: 'COVER',
  motion: 'NONE',
  transition: 'NONE',
  transition_ms: 0,
  background: '#000000',
  texts: [],
  overlays: [],
  ...over,
});

/** A reel that passes everything: a hooked first scene, music, a watermark. */
const ready = (over: Partial<ReelSpec> = {}): ReelSpec => ({
  ...emptySpec(),
  scenes: [scene({ id: 'a', duration_ms: 2000, texts: [text('Stay for this')] }), scene({ id: 'b', asset_id: 'clip', duration_ms: 3000 })],
  music: { asset_id: 'song', volume: 0.5, trim_start_ms: 0 },
  brand: { ...emptySpec().brand, watermark_asset_id: 'logo', watermark_corner: 'TOP_LEFT' },
  ...over,
});

const byName = (spec: ReelSpec, platforms: Parameters<typeof reelChecks>[2] = ['INSTAGRAM']) =>
  Object.fromEntries(reelChecks(spec, ASSETS, platforms).map((check) => [check.name, check]));

describe('reelChecks — the networks', () => {
  it('lists the published reel limit of every network', () => {
    expect(REEL_PLATFORM_MAX_MS).toEqual({ INSTAGRAM: 90_000, FACEBOOK: 90_000, THREADS: 90_000, YOUTUBE: 60_000, LINKEDIN: 600_000, X: 140_000 });
  });

  it('checks the length against each network, once per network, and says how much to cut', () => {
    const long = ready({ scenes: Array.from({ length: 4 }, (_item, index) => scene({ id: `s${index}`, duration_ms: 25_000, texts: index === 0 ? [text('Hook')] : [] })) });
    const checks = byName(long, ['INSTAGRAM', 'LINKEDIN', 'INSTAGRAM']);
    expect(checks['duration:INSTAGRAM']).toEqual({ name: 'duration:INSTAGRAM', pass: false, detail: '100.0s is over the 90.0s Instagram allows — cut 10.0s.' });
    expect(checks['duration:LINKEDIN']).toEqual({ name: 'duration:LINKEDIN', pass: true, detail: '100.0s of the 600.0s LinkedIn allows.' });
    expect(Object.keys(checks).filter((name) => name.startsWith('duration:'))).toHaveLength(2);
  });

  it('fails the length of an empty reel rather than passing a reel of nothing', () => {
    expect(byName(emptySpec(), ['X'])['duration:X']).toMatchObject({ pass: false, detail: expect.stringContaining('no scenes yet') });
  });

  it('wants portrait on Instagram, YouTube Shorts and Threads, and does not mind elsewhere', () => {
    const square = ready({ aspect: 'SQUARE' });
    const checks = byName(square, ['INSTAGRAM', 'YOUTUBE', 'THREADS', 'FACEBOOK', 'LINKEDIN', 'X']);
    expect(checks['aspect:INSTAGRAM']).toMatchObject({ pass: false, detail: 'Instagram shows reels in portrait; this reel is square.' });
    expect(checks['aspect:YOUTUBE'].pass).toBe(false);
    expect(checks['aspect:THREADS'].pass).toBe(false);
    expect(checks['aspect:FACEBOOK']).toBeUndefined();
    expect(checks['aspect:LINKEDIN']).toBeUndefined();
    expect(checks['aspect:X']).toBeUndefined();
    expect(byName(ready(), ['YOUTUBE'])['aspect:YOUTUBE']).toMatchObject({ pass: true });
  });
});

describe('reelChecks — the reel itself', () => {
  it('passes a ready reel on every check', () => {
    expect(reelChecks(ready(), ASSETS, ['INSTAGRAM']).every((check) => check.pass)).toBe(true);
  });

  it('hears a voiceover, then music, then a clip with its volume up — and nothing else', () => {
    const silent = ready({ music: null });
    expect(byName(ready({ voiceover: { asset_id: 'song', volume: 1 } })).sound).toMatchObject({ pass: true, detail: 'A voiceover plays under the reel.' });
    expect(byName(ready()).sound).toMatchObject({ pass: true, detail: 'Music plays under the reel.' });
    expect(byName(ready({ music: null, scenes: [scene({ id: 'a', texts: [text('Hook')] }), scene({ id: 'b', asset_id: 'clip', volume: 0.3 })] })).sound).toMatchObject({ pass: true, detail: 'At least one clip plays its own sound.' });
    expect(byName(silent).sound).toMatchObject({ pass: false, detail: expect.stringContaining('Silent') });
    // A picture with "volume" is still silent.
    expect(byName(ready({ music: null, scenes: [scene({ id: 'a', asset_id: 'logo', volume: 1, texts: [text('Hook')] })] })).sound.pass).toBe(false);
  });

  it('counts texts past the per-scene ceiling and words past the length ceiling', () => {
    const crowded = ready({
      scenes: [
        scene({ id: 'a', texts: Array.from({ length: REEL_LIMITS.maxTexts + 1 }, (_item, index) => text(`line ${index}`)) }),
        scene({ id: 'b', texts: [text('x'.repeat(REEL_LIMITS.maxTextLength + 1))] }),
      ],
    });
    expect(byName(crowded).text).toEqual({ name: 'text', pass: false, detail: `1 scene(s) carry more than ${REEL_LIMITS.maxTexts} texts; 1 text(s) run past ${REEL_LIMITS.maxTextLength} characters.` });
    expect(byName(ready()).text.pass).toBe(true);
  });

  it('wants a hook: a text at the very start of a first scene that lasts at least a second and a half', () => {
    expect(byName(ready()).hook).toEqual({ name: 'hook', pass: true, detail: 'Opens on “Stay for this” for 2.0s.' });
    expect(byName(ready({ scenes: [scene({ id: 'a', duration_ms: 1000, texts: [text('Hook')] })] })).hook).toMatchObject({ pass: false, detail: expect.stringContaining('give the hook at least 1.5s') });
    expect(byName(ready({ scenes: [scene({ id: 'a', texts: [text('Late', 1200)] })] })).hook).toMatchObject({ pass: false, detail: expect.stringContaining('no text at its start') });
    expect(byName(ready({ scenes: [] })).hook).toMatchObject({ pass: false, detail: 'The reel has no scenes yet.' });
  });

  it('wants the brand watermark, named with its corner when it is there', () => {
    expect(byName(ready()).watermark).toEqual({ name: 'watermark', pass: true, detail: 'logo.png in the top left.' });
    expect(byName(ready({ brand: emptySpec().brand })).watermark).toMatchObject({ pass: false, detail: expect.stringContaining('No brand watermark') });
  });

  it('keeps the checks in the order the studio lists them', () => {
    expect(reelChecks(ready(), ASSETS, ['X', 'INSTAGRAM']).map((check) => check.name)).toEqual([
      'duration:X',
      'duration:INSTAGRAM',
      'aspect:INSTAGRAM',
      'sound',
      'text',
      'hook',
      'watermark',
    ]);
  });
});
