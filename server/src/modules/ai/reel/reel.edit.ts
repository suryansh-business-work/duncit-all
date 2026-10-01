import { randomUUID } from 'node:crypto';
import type { ReelAsset } from './reel.model';

/**
 * The reel's edit, as data — the one contract between the model that writes it,
 * the server that stores it and the Remotion composition that plays it.
 *
 * A model's answer is a suggestion, not a spec: it names clips that are not in
 * the project, trims past the end of a video and returns a string where a
 * number goes. `sanitizeSpec` is the only way a spec is ever written or read,
 * so everything downstream — the stored document, the GraphQL payload, the
 * player — can trust every field without checking it again. The server is the
 * authority; the portal only draws what it is handed.
 *
 * Times are milliseconds throughout. Frames are the player's concern, derived
 * from `fps` at the last moment, so the same spec plays at any frame rate.
 */

export const REEL_FPS = 30;
export const REEL_WIDTH = 1080;
export const REEL_HEIGHT = 1920;

export const REEL_LIMITS = {
  maxScenes: 40,
  minSceneMs: 500,
  maxSceneMs: 60_000,
  maxTotalMs: 180_000,
  maxTexts: 6,
  maxTextLength: 220,
  maxOverlays: 4,
  transitionMs: 500,
} as const;

export const REEL_FITS = ['COVER', 'CONTAIN'] as const;
export const REEL_MOTIONS = ['NONE', 'ZOOM_IN', 'ZOOM_OUT', 'PAN_LEFT', 'PAN_RIGHT'] as const;
export const REEL_TRANSITIONS = ['NONE', 'FADE', 'SLIDE', 'WIPE'] as const;
export const REEL_TEXT_POSITIONS = ['TOP', 'CENTER', 'BOTTOM'] as const;
export const REEL_TEXT_STYLES = ['TITLE', 'SUBTITLE', 'CAPTION'] as const;
export const REEL_TEXT_ANIMATIONS = ['NONE', 'FADE', 'POP', 'SLIDE_UP', 'TYPEWRITER'] as const;
export const REEL_CORNERS = ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT', 'CENTER'] as const;

export interface ReelText {
  id: string;
  text: string;
  position: (typeof REEL_TEXT_POSITIONS)[number];
  style: (typeof REEL_TEXT_STYLES)[number];
  animation: (typeof REEL_TEXT_ANIMATIONS)[number];
  /** From the start of its scene. */
  start_ms: number;
  /** 0 = stays until the scene ends. */
  duration_ms: number;
  color: string;
  /** A pill behind the words; empty for none. */
  background: string;
}

export interface ReelOverlay {
  id: string;
  asset_id: string;
  corner: (typeof REEL_CORNERS)[number];
  /** Width as a share of the frame. */
  width_pct: number;
  opacity: number;
  start_ms: number;
  /** 0 = stays until the scene ends. */
  duration_ms: number;
}

export interface ReelScene {
  id: string;
  /** Empty for a colour card — a scene that is only its background and text. */
  asset_id: string;
  duration_ms: number;
  /** VIDEO: where in the clip the scene starts. */
  trim_start_ms: number;
  volume: number;
  playback_rate: number;
  fit: (typeof REEL_FITS)[number];
  motion: (typeof REEL_MOTIONS)[number];
  /** How this scene arrives from the one before it. */
  transition: (typeof REEL_TRANSITIONS)[number];
  /** How long the two scenes overlap; 0 for a cut. */
  transition_ms: number;
  background: string;
  texts: ReelText[];
  overlays: ReelOverlay[];
}

export interface ReelMusic {
  asset_id: string;
  volume: number;
  trim_start_ms: number;
}

export interface ReelSpec {
  fps: number;
  width: number;
  height: number;
  background: string;
  scenes: ReelScene[];
  music: ReelMusic | null;
}

const BLACK = '#000000';
const WHITE = '#FFFFFF';
const HEX = /^#[\da-f]{6}$/i;
/** Long enough to read, short enough that a text never outlives its scene by rounding. */
const MIN_TEXT_MS = 200;

type Raw = Record<string, unknown>;
type AssetMap = ReadonlyMap<string, ReelAsset>;

const record = (value: unknown): Raw | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Raw) : null;

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** A model writes a number where a string goes as often as the reverse; anything else is not text. */
function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  return typeof value === 'number' ? String(value) : '';
}

/**
 * Only a number, or a string that reads as one, is a number. `Number(null)` and
 * `Number([])` are both 0 and `Number(true)` is 1 — coerced, a model's
 * `"volume": null` would mute a clip instead of leaving it at its default.
 */
function num(value: unknown, min: number, max: number, fallback: number): number {
  let parsed = Number.NaN;
  if (typeof value === 'number') parsed = value;
  else if (typeof value === 'string') parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

const int = (value: unknown, min: number, max: number, fallback: number): number =>
  Math.round(num(value, min, max, fallback));

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const wanted = asText(value).trim().toUpperCase();
  return allowed.find((item) => item === wanted) ?? fallback;
}

function hex(value: unknown, fallback: string): string {
  const wanted = asText(value).trim();
  return HEX.test(wanted) ? wanted.toUpperCase() : fallback;
}

const words = (value: unknown, max: number): string => asText(value).trim().slice(0, max);

/** The id the model gave when it is usable and new, otherwise a fresh one. */
function claimId(value: unknown, taken: Set<string>): string {
  const wanted = words(value, 40);
  const id = wanted && !taken.has(wanted) ? wanted : randomUUID().slice(0, 8);
  taken.add(id);
  return id;
}

/** A window inside a scene: where it starts and how long it stays (0 = to the end). */
function windowIn(item: Raw, sceneMs: number): { start_ms: number; duration_ms: number } {
  const start = int(item.start_ms, 0, Math.max(0, sceneMs - MIN_TEXT_MS), 0);
  const wanted = int(item.duration_ms, 0, sceneMs, 0);
  return { start_ms: start, duration_ms: wanted === 0 ? 0 : Math.min(Math.max(wanted, MIN_TEXT_MS), sceneMs - start) };
}

function sanitizeText(raw: unknown, sceneMs: number, taken: Set<string>): ReelText[] {
  const item = record(raw);
  const text = words(item?.text, REEL_LIMITS.maxTextLength);
  if (!item || !text) return [];
  return [
    {
      id: claimId(item.id, taken),
      text,
      position: oneOf(item.position, REEL_TEXT_POSITIONS, 'BOTTOM'),
      style: oneOf(item.style, REEL_TEXT_STYLES, 'CAPTION'),
      animation: oneOf(item.animation, REEL_TEXT_ANIMATIONS, 'FADE'),
      ...windowIn(item, sceneMs),
      color: hex(item.color, WHITE),
      background: hex(item.background, ''),
    },
  ];
}

function sanitizeOverlay(raw: unknown, sceneMs: number, assets: AssetMap, taken: Set<string>): ReelOverlay[] {
  const item = record(raw);
  const assetId = words(item?.asset_id, 80);
  // Only a picture can sit on top of a scene.
  if (!item || assets.get(assetId)?.kind !== 'IMAGE') return [];
  return [
    {
      id: claimId(item.id, taken),
      asset_id: assetId,
      corner: oneOf(item.corner, REEL_CORNERS, 'TOP_RIGHT'),
      width_pct: int(item.width_pct, 5, 100, 22),
      opacity: num(item.opacity, 0.1, 1, 1),
      ...windowIn(item, sceneMs),
    },
  ];
}

/** How a video scene is cut out of its clip. A picture or a card has nothing to cut. */
function videoTiming(item: Raw, asset: ReelAsset | undefined) {
  if (asset?.kind !== 'VIDEO') {
    return { trim_start_ms: 0, playback_rate: 1, volume: 0, maxMs: REEL_LIMITS.maxSceneMs };
  }
  const playback_rate = num(item.playback_rate, 0.25, 4, 1);
  // A clip Drive has not measured yet reports 0; its trim is then taken on trust.
  const known = asset.duration_ms > 0;
  const lastStart = known ? Math.max(0, asset.duration_ms - REEL_LIMITS.minSceneMs) : REEL_LIMITS.maxTotalMs * 100;
  const trim_start_ms = int(item.trim_start_ms, 0, lastStart, 0);
  const left = known ? Math.floor((asset.duration_ms - trim_start_ms) / playback_rate) : REEL_LIMITS.maxSceneMs;
  return {
    trim_start_ms,
    playback_rate,
    volume: num(item.volume, 0, 1, 1),
    maxMs: Math.min(REEL_LIMITS.maxSceneMs, Math.max(REEL_LIMITS.minSceneMs, left)),
  };
}

function sanitizeScene(raw: unknown, assets: AssetMap, taken: Set<string>): ReelScene | null {
  const item = record(raw);
  if (!item) return null;
  const assetId = words(item.asset_id, 80);
  const asset = assets.get(assetId);
  // A scene naming footage the project does not hold, or a sound file, has nothing to show.
  if (assetId && (!asset || asset.kind === 'AUDIO')) return null;
  const { maxMs, ...timing } = videoTiming(item, asset);
  const duration_ms = int(item.duration_ms, REEL_LIMITS.minSceneMs, maxMs, Math.min(3000, maxMs));
  return {
    id: claimId(item.id, taken),
    asset_id: assetId,
    duration_ms,
    ...timing,
    fit: oneOf(item.fit, REEL_FITS, 'COVER'),
    motion: oneOf(item.motion, REEL_MOTIONS, 'NONE'),
    transition: oneOf(item.transition, REEL_TRANSITIONS, 'NONE'),
    transition_ms: 0,
    background: hex(item.background, BLACK),
    texts: list(item.texts)
      .slice(0, REEL_LIMITS.maxTexts)
      .flatMap((text) => sanitizeText(text, duration_ms, taken)),
    overlays: list(item.overlays)
      .slice(0, REEL_LIMITS.maxOverlays)
      .flatMap((overlay) => sanitizeOverlay(overlay, duration_ms, assets, taken)),
  };
}

/**
 * Give each scene the overlap it arrives with. A transition is capped at half
 * of the shorter of the two scenes it joins, so a scene's way in and its way
 * out can never add up to more than the scene itself.
 */
function withTransitions(scenes: ReelScene[]): ReelScene[] {
  return scenes.map((scene, index) => {
    const before = scenes[index - 1];
    if (!before || scene.transition === 'NONE') return { ...scene, transition: 'NONE', transition_ms: 0 };
    const room = Math.floor(Math.min(before.duration_ms, scene.duration_ms) / 2);
    return { ...scene, transition_ms: Math.min(REEL_LIMITS.transitionMs, room) };
  });
}

/** The scenes that fit inside the longest reel allowed, in order. */
function withinTotal(scenes: ReelScene[]): ReelScene[] {
  const kept: ReelScene[] = [];
  let total = 0;
  for (const scene of scenes) {
    if (total + scene.duration_ms > REEL_LIMITS.maxTotalMs) break;
    total += scene.duration_ms;
    kept.push(scene);
  }
  return kept;
}

function sanitizeMusic(raw: unknown, assets: AssetMap): ReelMusic | null {
  const item = record(raw);
  const assetId = words(item?.asset_id, 80);
  const asset = assets.get(assetId);
  if (!item || asset?.kind !== 'AUDIO') return null;
  const lastStart = asset.duration_ms > 0 ? Math.max(0, asset.duration_ms - REEL_LIMITS.minSceneMs) : 0;
  return {
    asset_id: assetId,
    volume: num(item.volume, 0, 1, 0.6),
    trim_start_ms: int(item.trim_start_ms, 0, lastStart, 0),
  };
}

/** A reel with nothing in it yet — what a new project starts as. */
export function emptySpec(): ReelSpec {
  return { fps: REEL_FPS, width: REEL_WIDTH, height: REEL_HEIGHT, background: BLACK, scenes: [], music: null };
}

/**
 * Whatever came in — a model's answer, a stored document, nothing at all — as a
 * reel that can be played against these assets.
 */
export function sanitizeSpec(raw: unknown, assets: readonly ReelAsset[]): ReelSpec {
  const item = record(raw);
  if (!item) return emptySpec();
  const byId: AssetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const taken = new Set<string>();
  const scenes = list(item.scenes)
    .slice(0, REEL_LIMITS.maxScenes)
    .flatMap((scene) => sanitizeScene(scene, byId, taken) ?? []);
  return {
    ...emptySpec(),
    background: hex(item.background, BLACK),
    scenes: withTransitions(withinTotal(scenes)),
    music: sanitizeMusic(item.music, byId),
  };
}

/** How long the reel plays: every scene, minus the time neighbours overlap. */
export function specDurationMs(spec: ReelSpec): number {
  return spec.scenes.reduce((total, scene) => total + scene.duration_ms - scene.transition_ms, 0);
}
