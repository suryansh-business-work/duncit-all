import { occasionArtwork, type OccasionArtwork } from './occasion-artwork';
import type { OccasionDecoration, OccasionFlyer, OccasionMotion, OccasionOverlay, OccasionVectorLayer } from './occasion-design';
import { garlandMarks, twinkleAlpha, type OccasionMark } from './occasion-garland';
import {
  burstSparks,
  fireworkBursts,
  flyerPose,
  flyerTrail,
  particlePose,
  seedParticles,
  type OccasionParticle,
} from './occasion-motion';
import { occasionLayerPaths } from './occasion-shapes';

/**
 * A look laid out for one screen size, and the draw list for any instant of
 * it. The web renderer paints these operations onto a canvas each frame; a
 * preview can paint one frozen instant. Nothing here touches the DOM.
 */

/**
 * Paint `d` with its point (ox, oy) at (x, y), turned `rotate` radians and
 * scaled about that point; `flip` then squeezes it sideways (a 3D tumble).
 */
export interface MarkOp {
  op: 'mark';
  d: string;
  x: number;
  y: number;
  ox: number;
  oy: number;
  rotate: number;
  scale: number;
  flip: number;
  fill: string;
  stroke: string;
  stroke_width: number;
  alpha: number;
}

/** Paint an artwork's layers with its box's top-left at (x, y), `scale` px per artwork unit. */
export interface ArtOp {
  op: 'art';
  layers: readonly OccasionVectorLayer[];
  width: number;
  height: number;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  mirrored: boolean;
}

/** Paint an uploaded image `width` px wide (its height follows its own proportions). */
export interface ImageOp {
  op: 'image';
  src: string;
  x: number;
  y: number;
  width: number;
  rotate: number;
  mirrored: boolean;
}

/** A glowing spark; with a tail it streaks back to (tail_x, tail_y), as a fast spark does to the eye. */
export interface DotOp {
  op: 'dot';
  x: number;
  y: number;
  r: number;
  color: string;
  alpha: number;
  tail_x: number | null;
  tail_y: number | null;
}

/** A soft round glow: `color` at `inner_alpha` out to `inner_stop` of the radius, fading to `outer_alpha` at its edge. */
export interface RadialOp {
  op: 'radial';
  x: number;
  y: number;
  radius: number;
  inner_stop: number;
  color: string;
  inner_alpha: number;
  outer_alpha: number;
}

/** A full-width band fading from `top_alpha` at y0 to `bottom_alpha` at y1. */
export interface LinearOp {
  op: 'linear';
  y0: number;
  y1: number;
  color: string;
  top_alpha: number;
  bottom_alpha: number;
}

export type OccasionDrawOp = MarkOp | ArtOp | ImageOp | DotOp | RadialOp | LinearOp;

interface SceneLayer {
  motion: OccasionMotion;
  opacity: number;
  paths: string[];
  particles: OccasionParticle[];
}

interface SceneFlyer {
  flyer: OccasionFlyer;
  artwork: OccasionArtwork | null;
}

/** A look laid out for one screen: particles seeded, artwork resolved, garland placed. */
export interface OccasionScene {
  width: number;
  height: number;
  layers: SceneLayer[];
  flyers: SceneFlyer[];
  fireworks: OccasionDecoration['fireworks'];
  overlays: readonly OccasionOverlay[];
  garland: OccasionMark[];
}

/** Lay a look out for a `width × height` screen. The same `seed` scatters it the same way every time. */
export function occasionScene(decoration: OccasionDecoration, width: number, height: number, seed = 1): OccasionScene {
  return {
    width,
    height,
    layers: decoration.particles.map((layer, index) => {
      const paths = occasionLayerPaths(layer);
      return {
        motion: layer.motion,
        opacity: Math.min(1, Math.max(0, layer.opacity)),
        paths,
        particles: seedParticles(layer, width, paths.length, seed + index * 101),
      };
    }),
    flyers: decoration.flyers.map((flyer) => ({ flyer, artwork: occasionArtwork(flyer) })),
    fireworks: decoration.fireworks,
    overlays: decoration.overlays,
    garland: garlandMarks(decoration.garland, width),
  };
}

/** Fog banks drifting along the bottom of the screen. */
const FOG_BANKS = 3;

function overlayOps(overlay: OccasionOverlay, scene: OccasionScene, t: number): OccasionDrawOp[] {
  const { width, height } = scene;
  const strength = Math.min(1, Math.max(0, overlay.opacity));
  if (overlay.style === 'VIGNETTE') {
    const radius = Math.hypot(width, height) / 2;
    return [{ op: 'radial', x: width / 2, y: height / 2, radius, inner_stop: 0.55, color: overlay.color, inner_alpha: 0, outer_alpha: strength }];
  }
  if (overlay.style === 'GLOW_TOP') {
    return [{ op: 'linear', y0: 0, y1: height * 0.35, color: overlay.color, top_alpha: strength, bottom_alpha: 0 }];
  }
  if (overlay.style === 'FOG') {
    const radius = Math.max(width, height) * 0.35;
    return Array.from({ length: FOG_BANKS }, (_, i): RadialOp => {
      const drift = t * 0.012 * (i + 1) + i / FOG_BANKS;
      return {
        op: 'radial',
        x: (drift - Math.floor(drift)) * (width + radius * 2) - radius,
        y: height * (0.78 + 0.08 * i),
        radius,
        inner_stop: 0,
        color: overlay.color,
        inner_alpha: strength,
        outer_alpha: 0,
      };
    });
  }
  return [];
}

function particleOps(layer: SceneLayer, scene: OccasionScene, t: number): MarkOp[] {
  return layer.particles.map((particle) => {
    const pose = particlePose(particle, layer.motion, t, scene.width, scene.height, layer.opacity);
    return {
      op: 'mark',
      d: layer.paths[particle.shape] ?? '',
      x: pose.x,
      y: pose.y,
      ox: 12,
      oy: 12,
      rotate: pose.rotation,
      scale: particle.size / 24,
      flip: pose.flip,
      fill: particle.color,
      stroke: '',
      stroke_width: 0,
      alpha: pose.alpha,
    };
  });
}

function fireworkOps(scene: OccasionScene, t: number): DotOp[] {
  return fireworkBursts(scene.fireworks, t, scene.width, scene.height).flatMap((burst) =>
    burstSparks(burst, scene.fireworks, t).map((spark): DotOp => ({ op: 'dot', ...spark, color: burst.color })),
  );
}

function flyerOps({ flyer, artwork }: SceneFlyer, index: number, scene: OccasionScene, t: number): OccasionDrawOp[] {
  const pose = flyerPose(flyer, t, scene.width, scene.height, index);
  if (!pose) return [];
  const scale = artwork ? flyer.size / artwork.width : 1;
  const trail = flyer.trail_color
    ? flyerTrail(flyer, t, scene.width, scene.height, index, artwork ? artwork.height * scale : flyer.size / 2).map(
        (dot): DotOp => ({ op: 'dot', ...dot, color: flyer.trail_color, tail_x: null, tail_y: null }),
      )
    : [];
  if (artwork) {
    return [...trail, { op: 'art', layers: artwork.layers, width: artwork.width, height: artwork.height, x: pose.x, y: pose.y, scale, rotate: pose.rotation, mirrored: pose.mirrored }];
  }
  if (flyer.artwork === 'IMAGE' && flyer.image_url) {
    return [...trail, { op: 'image', src: flyer.image_url, x: pose.x, y: pose.y, width: flyer.size, rotate: pose.rotation, mirrored: pose.mirrored }];
  }
  return [];
}

function garlandOps(scene: OccasionScene, t: number): MarkOp[] {
  return scene.garland.map((mark) => ({
    op: 'mark',
    d: mark.d,
    x: mark.x,
    y: mark.y,
    ox: 0,
    oy: 0,
    rotate: mark.rotate,
    scale: 1,
    flip: 1,
    fill: mark.fill,
    stroke: mark.stroke,
    stroke_width: mark.stroke_width,
    alpha: mark.alpha * twinkleAlpha(mark.twinkle, t),
  }));
}

/**
 * Everything to paint at `t` seconds, back to front: atmosphere, the particle
 * swarms, fireworks, flyers with their trails, and the garland on top.
 */
export function occasionFrame(scene: OccasionScene, t: number): OccasionDrawOp[] {
  return [
    ...scene.overlays.flatMap((overlay) => overlayOps(overlay, scene, t)),
    ...scene.layers.flatMap((layer) => particleOps(layer, scene, t)),
    ...fireworkOps(scene, t),
    ...scene.flyers.flatMap((flyer, index) => flyerOps(flyer, index, scene, t)),
    ...garlandOps(scene, t),
  ];
}
