import { describe, expect, it } from 'vitest';
import type { ReelAsset, ReelScene, ReelSpec } from '@duncit/gql-types';
import {
  addOverlay,
  addText,
  duplicateScene,
  insertScene,
  maxSceneMs,
  moveScene,
  newId,
  newScene,
  removeOverlay,
  removeScene,
  removeText,
  setMusic,
  splitScene,
  updateMusic,
  updateOverlay,
  updateScene,
  updateText,
} from '../../src/pages/reels/editor/specEdits';

const video = { id: 'clip', kind: 'VIDEO', duration_ms: 6000 } as ReelAsset;
const picture = { id: 'logo', kind: 'IMAGE', duration_ms: 0 } as ReelAsset;

const base = (scenes: ReelScene[]): ReelSpec =>
  ({ fps: 30, width: 1080, height: 1920, background: '#000000', music: null, scenes }) as ReelSpec;

const sceneOf = (id: string, patch: Partial<ReelScene> = {}): ReelScene => ({ ...newScene(video), id, ...patch });

const ids = (spec: ReelSpec) => spec.scenes.map((scene) => scene.id);

describe('newId / newScene / maxSceneMs', () => {
  it('mints short ids with the kind as prefix', () => {
    expect(newId('s')).toMatch(/^s[\da-f]{6}$/);
  });

  it('starts a video scene with its sound, and a picture or a card silent and drifting', () => {
    expect(newScene(video)).toMatchObject({ asset_id: 'clip', duration_ms: 3000, volume: 1, motion: 'NONE' });
    expect(newScene(picture)).toMatchObject({ asset_id: 'logo', volume: 0, motion: 'ZOOM_IN' });
    expect(newScene(null)).toMatchObject({ asset_id: '', duration_ms: 3000 });
  });

  it('caps a video scene at what is left of the clip from its trim, at its speed', () => {
    expect(maxSceneMs({ trim_start_ms: 1000, playback_rate: 1 }, video)).toBe(5000);
    expect(maxSceneMs({ trim_start_ms: 0, playback_rate: 2 }, video)).toBe(3000);
    expect(maxSceneMs({ trim_start_ms: 5900, playback_rate: 1 }, video)).toBe(500);
    expect(maxSceneMs({ trim_start_ms: 0, playback_rate: 1 }, picture)).toBe(60_000);
    expect(maxSceneMs({ trim_start_ms: 0, playback_rate: 1 })).toBe(60_000);
    // A clip Drive has not measured yet reports 0 and is not capped.
    expect(maxSceneMs({ trim_start_ms: 0, playback_rate: 1 }, { ...video, duration_ms: 0 })).toBe(60_000);
  });

  it('starts a short clip no longer than the clip', () => {
    expect(newScene({ ...video, duration_ms: 1200 }).duration_ms).toBe(1200);
  });
});

describe('scene edits', () => {
  const spec = base([sceneOf('a'), sceneOf('b'), sceneOf('c')]);

  it('inserts, updates and removes without touching the original', () => {
    const inserted = insertScene(spec, sceneOf('x'), 1);
    expect(ids(inserted)).toEqual(['a', 'x', 'b', 'c']);
    expect(ids(insertScene(spec, sceneOf('y'), 99))).toEqual(['a', 'b', 'c', 'y']);
    expect(updateScene(spec, 'b', { duration_ms: 1500 }).scenes[1].duration_ms).toBe(1500);
    expect(ids(removeScene(spec, 'b'))).toEqual(['a', 'c']);
    expect(ids(spec)).toEqual(['a', 'b', 'c']);
  });

  it('moves a scene one place, and leaves one already at the end where it is', () => {
    expect(ids(moveScene(spec, 'b', -1))).toEqual(['b', 'a', 'c']);
    expect(ids(moveScene(spec, 'b', 1))).toEqual(['a', 'c', 'b']);
    expect(moveScene(spec, 'a', -1)).toBe(spec);
    expect(moveScene(spec, 'c', 1)).toBe(spec);
    expect(moveScene(spec, 'missing', 1)).toBe(spec);
  });

  it('duplicates a scene right after itself with fresh ids all the way down', () => {
    const withItems = base([sceneOf('a', { texts: [{ id: 't1' } as never], overlays: [{ id: 'o1' } as never] })]);
    const { spec: next, id } = duplicateScene(withItems, 'a');
    expect(ids(next)).toEqual(['a', id]);
    expect(next.scenes[1].texts[0].id).not.toBe('t1');
    expect(next.scenes[1].overlays[0].id).not.toBe('o1');
    expect(duplicateScene(withItems, 'missing')).toEqual({ spec: withItems, id: 'missing' });
  });
});

describe('splitScene', () => {
  const texts = [
    { id: 'early', start_ms: 0, duration_ms: 0 },
    { id: 'crosses', start_ms: 500, duration_ms: 2000 },
    { id: 'late', start_ms: 2500, duration_ms: 300 },
  ] as never;
  const overlays = [{ id: 'logo', start_ms: 2000, duration_ms: 0 }] as never;
  const spec = base([sceneOf('a', { duration_ms: 4000, trim_start_ms: 1000, playback_rate: 2, transition: 'FADE', texts, overlays })]);

  it('cuts in two: the second half continues the clip where the first stopped, on a plain cut', () => {
    const { spec: next, id } = splitScene(spec, 'a', 1500);
    const [first, second] = next.scenes;
    expect(first).toMatchObject({ id: 'a', duration_ms: 1500 });
    expect(second).toMatchObject({ id, duration_ms: 2500, trim_start_ms: 4000, transition: 'NONE', transition_ms: 0 });
    // Items starting before the cut stay and end there at the latest; later ones move with the clock.
    expect(first.texts.map((text) => [text.id, text.duration_ms])).toEqual([['early', 0], ['crosses', 1000]]);
    expect(second.texts.map((text) => [text.id, text.start_ms])).toEqual([['late', 1000]]);
    expect(second.overlays.map((overlay) => overlay.start_ms)).toEqual([500]);
  });

  it('refuses a cut that would leave a scene shorter than half a second', () => {
    expect(splitScene(spec, 'a', 300).spec).toBe(spec);
    expect(splitScene(spec, 'a', 3800).spec).toBe(spec);
    expect(splitScene(spec, 'missing', 2000).spec).toBe(spec);
  });
});

describe('text, overlay and music edits', () => {
  const spec = base([sceneOf('a')]);

  it('adds, edits and removes a text on its scene', () => {
    const { spec: withText, id } = addText(spec, 'a', 'Sunday Jam');
    expect(withText.scenes[0].texts[0]).toMatchObject({ id, text: 'Sunday Jam', position: 'BOTTOM', duration_ms: 0 });
    const edited = updateText(withText, 'a', id, { text: 'Jam!' });
    expect(edited.scenes[0].texts[0].text).toBe('Jam!');
    expect(updateText(withText, 'a', 'other', { text: 'x' }).scenes[0].texts[0].text).toBe('Sunday Jam');
    expect(removeText(edited, 'a', id).scenes[0].texts).toEqual([]);
  });

  it('adds, edits and removes an overlay on its scene', () => {
    const { spec: withLogo, id } = addOverlay(spec, 'a', 'logo');
    expect(withLogo.scenes[0].overlays[0]).toMatchObject({ id, asset_id: 'logo', corner: 'TOP_RIGHT', opacity: 1 });
    expect(updateOverlay(withLogo, 'a', id, { corner: 'CENTER' }).scenes[0].overlays[0].corner).toBe('CENTER');
    expect(updateOverlay(withLogo, 'a', 'other', { corner: 'CENTER' }).scenes[0].overlays[0].corner).toBe('TOP_RIGHT');
    expect(removeOverlay(withLogo, 'a', id).scenes[0].overlays).toEqual([]);
  });

  it('sets, edits and clears the music', () => {
    const withSong = setMusic(spec, 'song');
    expect(withSong.music).toEqual({ asset_id: 'song', volume: 0.6, trim_start_ms: 0 });
    expect(updateMusic(withSong, { volume: 0.2 }).music?.volume).toBe(0.2);
    expect(updateMusic(spec, { volume: 0.2 })).toBe(spec);
    expect(setMusic(withSong, null).music).toBeNull();
  });
});
