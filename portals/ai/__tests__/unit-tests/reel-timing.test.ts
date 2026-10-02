import { describe, expect, it } from 'vitest';
import type { ReelScene, ReelSpec } from '@duncit/gql-types';
import {
  msToFrames,
  reelDurationInFrames,
  sceneTimings,
  windowFrames,
} from '../../src/pages/reels/composition/timing';

const scene = (id: string, duration_ms: number, transition_ms = 0): ReelScene =>
  ({ id, duration_ms, transition_ms, transition: transition_ms > 0 ? 'FADE' : 'NONE' }) as ReelScene;

const spec = (scenes: ReelScene[], fps = 30): ReelSpec => ({ fps, scenes }) as ReelSpec;

describe('msToFrames', () => {
  it('changes the clock from milliseconds to frames at the reel’s rate', () => {
    expect(msToFrames(1000, 30)).toBe(30);
    expect(msToFrames(500, 24)).toBe(12);
    expect(msToFrames(0, 30)).toBe(0);
    // Rounded to the nearest frame, never truncated.
    expect(msToFrames(50, 30)).toBe(2);
  });
});

describe('sceneTimings', () => {
  it('lays scenes end to end when they cut', () => {
    const timings = sceneTimings(spec([scene('a', 2000), scene('b', 1000)]));
    expect(timings.map(({ frames, transitionFrames, from }) => [frames, transitionFrames, from])).toEqual([
      [60, 0, 0],
      [30, 0, 60],
    ]);
    expect(reelDurationInFrames(timings)).toBe(90);
  });

  it('starts a scene early by the overlap it arrives with', () => {
    const timings = sceneTimings(spec([scene('a', 2000), scene('b', 2000, 500)]));
    expect(timings[1]).toMatchObject({ frames: 60, transitionFrames: 15, from: 45 });
    expect(reelDurationInFrames(timings)).toBe(105);
  });

  it('gives the first scene no overlap, whatever it asks for', () => {
    const [first] = sceneTimings(spec([scene('a', 2000, 500)]));
    expect(first).toMatchObject({ transitionFrames: 0, from: 0 });
  });

  it('caps an overlap at half of the shorter scene it joins', () => {
    // 500 ms scenes are 15 frames; half is 7, though the overlap asked for is 15.
    const timings = sceneTimings(spec([scene('a', 500), scene('b', 500, 500)]));
    expect(timings[1].transitionFrames).toBe(7);
  });

  it('never makes a scene shorter than one frame', () => {
    const [only] = sceneTimings(spec([scene('a', 1)]));
    expect(only.frames).toBe(1);
  });
});

describe('reelDurationInFrames', () => {
  it('is one frame for an empty reel, so it is still a playable composition', () => {
    expect(reelDurationInFrames([])).toBe(1);
  });
});

describe('windowFrames', () => {
  it('runs to the end of the scene when no length is given', () => {
    expect(windowFrames(1000, 0, 90, 30)).toEqual({ from: 30, durationInFrames: 60 });
  });

  it('keeps a window inside its scene', () => {
    // Asked to start after the scene ends, and to last longer than it does.
    expect(windowFrames(10_000, 10_000, 90, 30)).toEqual({ from: 89, durationInFrames: 1 });
    expect(windowFrames(1000, 500, 90, 30)).toEqual({ from: 30, durationInFrames: 15 });
  });

  it('is at least one frame long, even on a scene with none to spare', () => {
    expect(windowFrames(0, 1, 0, 30)).toEqual({ from: 0, durationInFrames: 1 });
  });
});
