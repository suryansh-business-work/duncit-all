import type { ReelOverlay, ReelScene, ReelSpec, ReelText } from '@duncit/gql-types';
import { sceneTimings } from '../composition/timing';

/**
 * Where everything sits on the timeline, in milliseconds of the finished reel.
 *
 * Scene positions come from `sceneTimings` — the frames the player itself
 * plays — converted back to milliseconds, so a block on the timeline starts on
 * exactly the frame the preview shows it, transitions' overlaps included.
 */

/** What the timeline has selected; the inspector edits exactly this. */
export type ReelSelection =
  | { kind: 'scene'; sceneId: string }
  | { kind: 'text'; sceneId: string; itemId: string }
  | { kind: 'overlay'; sceneId: string; itemId: string }
  | { kind: 'music' };

export interface SceneSpan {
  scene: ReelScene;
  index: number;
  startMs: number;
  endMs: number;
}

export type ItemKind = 'text' | 'overlay';

export interface ItemSpan {
  kind: ItemKind;
  sceneId: string;
  item: ReelText | ReelOverlay;
  startMs: number;
  endMs: number;
  /** Which row of its track it is drawn on, so overlapping items never hide each other. */
  lane: number;
}

export const framesToMs = (frames: number, fps: number): number => Math.round((frames / fps) * 1000);

export function sceneSpans(spec: ReelSpec): SceneSpan[] {
  return sceneTimings(spec).map((timing, index) => ({
    scene: timing.scene,
    index,
    startMs: framesToMs(timing.from, spec.fps),
    endMs: framesToMs(timing.from + timing.frames, spec.fps),
  }));
}

/** The reel's length in milliseconds — where the last scene ends. */
export const reelLengthMs = (spans: readonly SceneSpan[]): number => spans.at(-1)?.endMs ?? 0;

/** The scene on screen at `ms` — the later one while two overlap in a transition. */
export function sceneAt(spans: readonly SceneSpan[], ms: number): SceneSpan | undefined {
  let found: SceneSpan | undefined;
  for (const span of spans) {
    if (span.startMs <= ms && ms < span.endMs) found = span;
  }
  return found ?? spans.at(-1);
}

/** Gives each item the first row free at its start. */
function assignLanes(items: Omit<ItemSpan, 'lane'>[]): ItemSpan[] {
  const laneEnds: number[] = [];
  return [...items]
    .sort((a, b) => a.startMs - b.startMs)
    .map((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.startMs);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = item.endMs;
      return { ...item, lane };
    });
}

/** Every text (or overlay) of the reel, placed on the reel's own clock. */
export function itemSpans(spans: readonly SceneSpan[], kind: ItemKind): ItemSpan[] {
  const items = spans.flatMap((span) => {
    const list: readonly (ReelText | ReelOverlay)[] = kind === 'text' ? span.scene.texts : span.scene.overlays;
    return list.map((item) => {
      const startMs = Math.min(span.startMs + item.start_ms, span.endMs);
      const endMs = item.duration_ms === 0 ? span.endMs : Math.min(startMs + item.duration_ms, span.endMs);
      return { kind, sceneId: span.scene.id, item, startMs, endMs };
    });
  });
  return assignLanes(items);
}

/** Whether a selection still points at something — an edit or a chat reply can remove it. */
export function selectionExists(spec: ReelSpec, selection: ReelSelection | null): boolean {
  if (!selection) return false;
  if (selection.kind === 'music') return spec.music !== null && spec.music !== undefined;
  const scene = spec.scenes.find((item) => item.id === selection.sceneId);
  if (!scene) return false;
  if (selection.kind === 'scene') return true;
  const list: readonly { id: string }[] = selection.kind === 'text' ? scene.texts : scene.overlays;
  return list.some((item) => item.id === selection.itemId);
}
