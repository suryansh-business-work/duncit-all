import { describe, expect, it } from 'vitest';
import type { ReelScene, ReelSpec } from '@duncit/gql-types';
import {
  framesToMs,
  itemSpans,
  reelLengthMs,
  sceneAt,
  sceneSpans,
  selectionExists,
} from '../../src/pages/reels/editor/layout';

const scene = (id: string, duration_ms: number, extra: Partial<ReelScene> = {}): ReelScene =>
  ({ id, duration_ms, transition: 'NONE', transition_ms: 0, texts: [], overlays: [], ...extra }) as ReelScene;

const spec = (scenes: ReelScene[], music: ReelSpec['music'] = null): ReelSpec =>
  ({ fps: 30, width: 1080, height: 1920, background: '#000000', music, scenes }) as ReelSpec;

describe('sceneSpans', () => {
  it('places scenes end to end, and overlaps one that arrives with a transition', () => {
    const spans = sceneSpans(spec([scene('a', 2000), scene('b', 2000, { transition: 'FADE', transition_ms: 500 })]));
    expect(spans.map(({ startMs, endMs }) => [startMs, endMs])).toEqual([
      [0, 2000],
      [1500, 3500],
    ]);
    expect(reelLengthMs(spans)).toBe(3500);
    expect(reelLengthMs([])).toBe(0);
    expect(framesToMs(45, 30)).toBe(1500);
  });

  it('finds the scene on screen — the later one during an overlap, the last past the end', () => {
    const spans = sceneSpans(spec([scene('a', 2000), scene('b', 2000, { transition: 'FADE', transition_ms: 500 })]));
    expect(sceneAt(spans, 100)?.scene.id).toBe('a');
    expect(sceneAt(spans, 1700)?.scene.id).toBe('b');
    expect(sceneAt(spans, 9999)?.scene.id).toBe('b');
    expect(sceneAt([], 0)).toBeUndefined();
  });
});

describe('itemSpans', () => {
  const reel = spec([
    scene('a', 3000, {
      texts: [
        { id: 't1', start_ms: 0, duration_ms: 0 },
        { id: 't2', start_ms: 1000, duration_ms: 500 },
      ] as never,
      overlays: [{ id: 'o1', start_ms: 9000, duration_ms: 0 }] as never,
    }),
    scene('b', 2000, { texts: [{ id: 't3', start_ms: 0, duration_ms: 5000 }] as never }),
  ]);
  const spans = sceneSpans(reel);

  it('puts each item on the reel clock, clamped to its scene, on the first free row', () => {
    const texts = itemSpans(spans, 'text');
    expect(texts.map(({ item, startMs, endMs, lane }) => [item.id, startMs, endMs, lane])).toEqual([
      ['t1', 0, 3000, 0],
      ['t2', 1000, 1500, 1],
      ['t3', 3000, 5000, 0],
    ]);
  });

  it('clamps an item that would start after its scene to the scene end', () => {
    const [overlay] = itemSpans(spans, 'overlay');
    expect(overlay).toMatchObject({ kind: 'overlay', sceneId: 'a', startMs: 3000, endMs: 3000 });
  });
});

describe('selectionExists', () => {
  const reel = spec(
    [scene('a', 2000, { texts: [{ id: 't1' }] as never, overlays: [{ id: 'o1' }] as never })],
    { asset_id: 'song', volume: 0.5, trim_start_ms: 0 } as ReelSpec['music']
  );

  it('answers for every kind of selection, and false once its target is gone', () => {
    expect(selectionExists(reel, null)).toBe(false);
    expect(selectionExists(reel, { kind: 'music' })).toBe(true);
    expect(selectionExists(spec([]), { kind: 'music' })).toBe(false);
    expect(selectionExists(reel, { kind: 'scene', sceneId: 'a' })).toBe(true);
    expect(selectionExists(reel, { kind: 'scene', sceneId: 'gone' })).toBe(false);
    expect(selectionExists(reel, { kind: 'text', sceneId: 'a', itemId: 't1' })).toBe(true);
    expect(selectionExists(reel, { kind: 'text', sceneId: 'a', itemId: 'gone' })).toBe(false);
    expect(selectionExists(reel, { kind: 'overlay', sceneId: 'a', itemId: 'o1' })).toBe(true);
  });
});
