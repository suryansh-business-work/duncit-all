import {
  occasionFrame,
  type LinearOp,
  type OccasionArtwork,
  type OccasionDrawOp,
  type OccasionFlyer,
  type OccasionParticle,
  type OccasionScene,
  type OccasionVectorLayer,
  type RadialOp,
} from '@duncit/utils';

/**
 * The engine's laid-out scene (`occasionScene`) cut into the pieces the
 * native views draw, each with a stable id. Everything here is computed once
 * per look and screen size; only the clock moves after that.
 */

export type SceneLayer = OccasionScene['layers'][number];

/** How a vector piece paints in react-native-svg: '' fill paints none, and an outline needs a width. */
export function vectorPaint(piece: Pick<OccasionVectorLayer, 'fill' | 'stroke' | 'stroke_width'>): {
  fill: string;
  stroke: string;
  strokeWidth: number;
} {
  const stroked = piece.stroke !== '' && piece.stroke_width > 0;
  return {
    fill: piece.fill === '' ? 'none' : piece.fill,
    stroke: stroked ? piece.stroke : 'none',
    strokeWidth: stroked ? piece.stroke_width : 0,
  };
}

export interface ParticleMarkEntry {
  id: string;
  particle: OccasionParticle;
  path: string;
}

/** A layer's particles with the path each one draws; one with no drawable path is left out. */
export function particleMarks(layer: SceneLayer): ParticleMarkEntry[] {
  return layer.particles.flatMap((particle, n) => {
    const path = layer.paths[particle.shape];
    return path ? [{ id: `mark-${n}`, particle, path }] : [];
  });
}

export interface FlyerEntry {
  id: string;
  /** Its place in the look, which sets when it first sets off. */
  index: number;
  flyer: OccasionFlyer;
  artwork: OccasionArtwork | null;
}

/** The flyers this build can draw: vector artwork, or an uploaded picture. */
export function drawableFlyers(scene: Pick<OccasionScene, 'flyers'>): FlyerEntry[] {
  return scene.flyers.flatMap(({ flyer, artwork }, index) =>
    artwork || (flyer.artwork === 'IMAGE' && flyer.image_url !== '')
      ? [{ id: `flyer-${index}`, index, flyer, artwork }]
      : [],
  );
}

export interface OverlayPart {
  id: string;
  op: RadialOp | LinearOp;
  /** Fog: the clock carries this bank sideways. */
  drifts: boolean;
  /** Which fog bank it is (its drift speed and start). */
  bank: number;
}

const isWash = (op: OccasionDrawOp): op is RadialOp | LinearOp =>
  op.op === 'radial' || op.op === 'linear';

/**
 * Each overlay's glows as the engine lays them out at the start: a vignette is
 * one radial glow, a top glow one fading band, fog a few soft banks whose
 * left-right place the clock then moves.
 */
export function overlayParts(scene: OccasionScene): OverlayPart[] {
  const bare: OccasionScene = {
    ...scene,
    layers: [],
    flyers: [],
    garland: [],
    fireworks: { ...scene.fireworks, enabled: false },
  };
  return scene.overlays.flatMap((overlay, n) =>
    occasionFrame({ ...bare, overlays: [overlay] }, 0)
      .filter(isWash)
      .map((op, bank) => ({
        id: `overlay-${n}-${bank}`,
        op,
        bank,
        drifts: overlay.style === 'FOG',
      })),
  );
}
