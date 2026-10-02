/**
 * The bounds the server's `sanitizeSpec` (server/src/modules/ai/reel/reel.edit.ts)
 * clamps every edit to. The timeline and the inspector forms respect the same
 * numbers so a hand edit is never silently rewritten on save — the server stays
 * the authority, this only keeps the screen honest about what it will accept.
 */
export const REEL_EDIT_LIMITS = {
  maxScenes: 40,
  minSceneMs: 500,
  maxSceneMs: 60_000,
  maxTotalMs: 180_000,
  maxTexts: 6,
  maxTextLength: 220,
  maxOverlays: 4,
  minItemMs: 200,
  minRate: 0.25,
  maxRate: 4,
  minOverlayWidth: 5,
  maxOverlayWidth: 100,
  minOverlayOpacity: 0.1,
} as const;

/** A new scene's length when its footage does not say otherwise. */
export const DEFAULT_SCENE_MS = 3000;

