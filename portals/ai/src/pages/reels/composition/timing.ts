import type { ReelScene, ReelSpec } from '@duncit/gql-types';

/**
 * Milliseconds to frames — the one place the reel's clock changes unit.
 *
 * The server keeps every time in milliseconds so the same edit plays at any
 * frame rate; Remotion counts frames. Everything that needs a frame number —
 * the composition, the player's length, the scene strip's seek — derives it
 * here, so the three can never disagree about where a scene starts.
 */

export const msToFrames = (ms: number, fps: number): number => Math.round((ms / 1000) * fps);

export interface SceneTiming {
  scene: ReelScene;
  /** How long the scene is on screen. Never less than one frame. */
  frames: number;
  /** How long it overlaps the scene before it; 0 for a cut. */
  transitionFrames: number;
  /** The frame the scene starts arriving on. */
  from: number;
}

/**
 * Every scene with its place on the timeline.
 *
 * A transition is floored, and capped at half of the shorter scene it joins:
 * the server already keeps it inside that bound in milliseconds, but rounding
 * to frames can tip a 250 ms overlap on a 500 ms scene over the edge, and a
 * scene whose way in and way out overlap is one Remotion refuses to play.
 */
export function sceneTimings(spec: ReelSpec): SceneTiming[] {
  const timings: SceneTiming[] = [];
  let cursor = 0;
  for (const scene of spec.scenes) {
    const frames = Math.max(1, msToFrames(scene.duration_ms, spec.fps));
    const before = timings.at(-1);
    const room = before ? Math.floor(Math.min(before.frames, frames) / 2) : 0;
    const transitionFrames = Math.min(Math.floor((scene.transition_ms / 1000) * spec.fps), room);
    const from = cursor - transitionFrames;
    timings.push({ scene, frames, transitionFrames, from });
    cursor = from + frames;
  }
  return timings;
}

/** The whole reel in frames. At least one, so an empty reel is still a playable composition. */
export function reelDurationInFrames(timings: readonly SceneTiming[]): number {
  const last = timings.at(-1);
  return Math.max(1, last ? last.from + last.frames : 1);
}

/** A window inside a scene, in frames: where it opens and how long it stays (0 ms = to the end). */
export function windowFrames(startMs: number, durationMs: number, sceneFrames: number, fps: number) {
  const from = Math.min(msToFrames(startMs, fps), Math.max(0, sceneFrames - 1));
  const wanted = durationMs === 0 ? sceneFrames - from : msToFrames(durationMs, fps);
  return { from, durationInFrames: Math.max(1, Math.min(wanted, sceneFrames - from)) };
}
