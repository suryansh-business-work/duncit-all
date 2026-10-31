/**
 * The bounds the server keeps a look inside (`occasion.validate.ts` and the
 * SDL's field descriptions). The sliders are drawn to them, so a value the
 * form offers is always one the server stores as given.
 */
export const LIMITS = {
  name: 60,
  description: 280,
  greeting: 80,
  particleLayers: 4,
  flyers: 3,
  overlays: 3,
  colors: 8,
  customPaths: 6,
  pathLength: 4000,
  imageUrl: 2000,
} as const;

export interface Range {
  min: number;
  max: number;
  step: number;
}

export const RANGES = {
  count: { min: 0, max: 160, step: 1 },
  size: { min: 2, max: 120, step: 1 },
  speed: { min: 1, max: 600, step: 1 },
  opacity: { min: 0.05, max: 1, step: 0.05 },
  altitude: { min: 0, max: 90, step: 1 },
  flyerSize: { min: 24, max: 480, step: 4 },
  duration: { min: 2, max: 60, step: 1 },
  interval: { min: 2, max: 600, step: 1 },
  bob: { min: 0, max: 60, step: 1 },
  bursts: { min: 1, max: 60, step: 1 },
  sparks: { min: 6, max: 60, step: 1 },
  radius: { min: 20, max: 300, step: 5 },
  overlayOpacity: { min: 0, max: 1, step: 0.05 },
} as const satisfies Record<string, Range>;

/**
 * What a new layer starts as — the same values the server fills in for a
 * field left out, so adding a layer and saving it straight away changes nothing.
 */
export const LAYER_DEFAULTS = {
  particle: { count: 30, size: [6, 14] as [number, number], speed: 40, opacity: 0.9 },
  flyer: { altitude: [10, 25] as [number, number], size: 160, duration: 12, interval: 30, bob: 8 },
  fireworks: { bursts_per_minute: 12, sparks: 28, radius: 90 },
  overlay: { opacity: 0.2 },
} as const;
