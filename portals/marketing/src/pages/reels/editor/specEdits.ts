import type { ReelAsset, ReelMusic, ReelOverlay, ReelScene, ReelSpec, ReelText } from '@duncit/gql-types';
import { DEFAULT_SCENE_MS, REEL_EDIT_LIMITS } from './limits';

/**
 * Every hand edit the timeline makes, as a pure function from one spec to the
 * next. Nothing here mutates: undo keeps the old spec as it was, and the player
 * redraws because the object it is handed changed.
 *
 * These mirror the shapes the server stores; the server sanitizes whatever is
 * saved (`sanitizeSpec`), so a rule kept here is about the screen agreeing with
 * the saved reel, not about trusting the client.
 */

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Short and unique within a reel — the server keeps an id it is handed when it is new. */
export const newId = (prefix: string): string => `${prefix}${globalThis.crypto.randomUUID().slice(0, 6)}`;

/** How long a scene can run: to the end of its clip from its trim, at its speed. */
export function maxSceneMs(scene: Pick<ReelScene, 'trim_start_ms' | 'playback_rate'>, asset?: ReelAsset): number {
  const { minSceneMs, maxSceneMs: longest } = REEL_EDIT_LIMITS;
  if (asset?.kind !== 'VIDEO' || asset.duration_ms <= 0) return longest;
  const left = Math.floor((asset.duration_ms - scene.trim_start_ms) / scene.playback_rate);
  return clamp(left, minSceneMs, longest);
}

/** A scene showing this footage — or a plain colour card when there is none. */
export function newScene(asset: ReelAsset | null): ReelScene {
  const video = asset?.kind === 'VIDEO';
  const scene: ReelScene = {
    id: newId('s'),
    asset_id: asset?.id ?? '',
    duration_ms: DEFAULT_SCENE_MS,
    trim_start_ms: 0,
    volume: video ? 1 : 0,
    playback_rate: 1,
    fit: 'COVER',
    motion: video ? 'NONE' : 'ZOOM_IN',
    transition: 'NONE',
    transition_ms: 0,
    background: '#000000',
    texts: [],
    overlays: [],
  };
  return { ...scene, duration_ms: Math.min(DEFAULT_SCENE_MS, maxSceneMs(scene, asset ?? undefined)) };
}

const withScenes = (spec: ReelSpec, scenes: ReelScene[]): ReelSpec => ({ ...spec, scenes });

const mapScene = (spec: ReelSpec, sceneId: string, change: (scene: ReelScene) => ReelScene): ReelSpec =>
  withScenes(spec, spec.scenes.map((scene) => (scene.id === sceneId ? change(scene) : scene)));

export function insertScene(spec: ReelSpec, scene: ReelScene, index: number): ReelSpec {
  const scenes = [...spec.scenes];
  scenes.splice(clamp(index, 0, scenes.length), 0, scene);
  return withScenes(spec, scenes);
}

export const updateScene = (spec: ReelSpec, sceneId: string, patch: Partial<ReelScene>): ReelSpec =>
  mapScene(spec, sceneId, (scene) => ({ ...scene, ...patch }));

export const removeScene = (spec: ReelSpec, sceneId: string): ReelSpec =>
  withScenes(spec, spec.scenes.filter((scene) => scene.id !== sceneId));

/** Swaps a scene with its neighbour; a scene already at that end stays put. */
export function moveScene(spec: ReelSpec, sceneId: string, delta: -1 | 1): ReelSpec {
  const index = spec.scenes.findIndex((scene) => scene.id === sceneId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= spec.scenes.length) return spec;
  const scenes = [...spec.scenes];
  [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
  return withScenes(spec, scenes);
}

/** A copy right after the original, with fresh ids all the way down. */
export function duplicateScene(spec: ReelSpec, sceneId: string): { spec: ReelSpec; id: string } {
  const index = spec.scenes.findIndex((scene) => scene.id === sceneId);
  const original = spec.scenes[index];
  if (!original) return { spec, id: sceneId };
  const copy: ReelScene = {
    ...original,
    id: newId('s'),
    texts: original.texts.map((text) => ({ ...text, id: newId('t') })),
    overlays: original.overlays.map((overlay) => ({ ...overlay, id: newId('o') })),
  };
  return { spec: insertScene(spec, copy, index + 1), id: copy.id };
}

/** Keeps the items that start before `cut`, ending them there at the latest. */
function itemsBefore<T extends ReelText | ReelOverlay>(items: readonly T[], cut: number): T[] {
  return items
    .filter((item) => item.start_ms < cut)
    .map((item) => ({ ...item, duration_ms: item.duration_ms === 0 ? 0 : Math.min(item.duration_ms, cut - item.start_ms) }));
}

/** Moves the items that start at or after `cut` to the second half's clock. */
const itemsAfter = <T extends ReelText | ReelOverlay>(items: readonly T[], cut: number): T[] =>
  items.filter((item) => item.start_ms >= cut).map((item) => ({ ...item, start_ms: item.start_ms - cut }));

/**
 * Cuts a scene in two at `atMs` from its start. The second half continues the
 * same footage from where the first stopped, and arrives on a plain cut. Too
 * close to either end to leave two playable scenes, nothing changes.
 */
export function splitScene(spec: ReelSpec, sceneId: string, atMs: number): { spec: ReelSpec; id: string } {
  const index = spec.scenes.findIndex((scene) => scene.id === sceneId);
  const scene = spec.scenes[index];
  const cut = Math.round(atMs);
  const { minSceneMs } = REEL_EDIT_LIMITS;
  if (!scene || cut < minSceneMs || scene.duration_ms - cut < minSceneMs) return { spec, id: sceneId };
  const first: ReelScene = {
    ...scene,
    duration_ms: cut,
    texts: itemsBefore(scene.texts, cut),
    overlays: itemsBefore(scene.overlays, cut),
  };
  const second: ReelScene = {
    ...scene,
    id: newId('s'),
    duration_ms: scene.duration_ms - cut,
    trim_start_ms: scene.trim_start_ms + Math.round(cut * scene.playback_rate),
    transition: 'NONE',
    transition_ms: 0,
    texts: itemsAfter(scene.texts, cut),
    overlays: itemsAfter(scene.overlays, cut),
  };
  const scenes = [...spec.scenes];
  scenes.splice(index, 1, first, second);
  return { spec: withScenes(spec, scenes), id: second.id };
}

export function addText(spec: ReelSpec, sceneId: string, words: string): { spec: ReelSpec; id: string } {
  const text: ReelText = {
    id: newId('t'),
    text: words,
    position: 'BOTTOM',
    style: 'CAPTION',
    animation: 'FADE',
    start_ms: 0,
    duration_ms: 0,
    color: '#FFFFFF',
    background: '',
  };
  return { spec: mapScene(spec, sceneId, (scene) => ({ ...scene, texts: [...scene.texts, text] })), id: text.id };
}

export const updateText = (spec: ReelSpec, sceneId: string, textId: string, patch: Partial<ReelText>): ReelSpec =>
  mapScene(spec, sceneId, (scene) => ({
    ...scene,
    texts: scene.texts.map((text) => (text.id === textId ? { ...text, ...patch } : text)),
  }));

export const removeText = (spec: ReelSpec, sceneId: string, textId: string): ReelSpec =>
  mapScene(spec, sceneId, (scene) => ({ ...scene, texts: scene.texts.filter((text) => text.id !== textId) }));

export function addOverlay(spec: ReelSpec, sceneId: string, assetId: string): { spec: ReelSpec; id: string } {
  const overlay: ReelOverlay = {
    id: newId('o'),
    asset_id: assetId,
    corner: 'TOP_RIGHT',
    width_pct: 22,
    opacity: 1,
    start_ms: 0,
    duration_ms: 0,
  };
  return {
    spec: mapScene(spec, sceneId, (scene) => ({ ...scene, overlays: [...scene.overlays, overlay] })),
    id: overlay.id,
  };
}

export const updateOverlay = (
  spec: ReelSpec,
  sceneId: string,
  overlayId: string,
  patch: Partial<ReelOverlay>
): ReelSpec =>
  mapScene(spec, sceneId, (scene) => ({
    ...scene,
    overlays: scene.overlays.map((overlay) => (overlay.id === overlayId ? { ...overlay, ...patch } : overlay)),
  }));

export const removeOverlay = (spec: ReelSpec, sceneId: string, overlayId: string): ReelSpec =>
  mapScene(spec, sceneId, (scene) => ({
    ...scene,
    overlays: scene.overlays.filter((overlay) => overlay.id !== overlayId),
  }));

/** Puts a sound file under the whole reel, or takes the music away with null. */
export const setMusic = (spec: ReelSpec, assetId: string | null): ReelSpec => ({
  ...spec,
  music: assetId ? { asset_id: assetId, volume: 0.6, trim_start_ms: 0 } : null,
});

export const updateMusic = (spec: ReelSpec, patch: Partial<ReelMusic>): ReelSpec =>
  spec.music ? { ...spec, music: { ...spec.music, ...patch } } : spec;
