import { LAYER_DEFAULTS } from './occasion-theme.limits';
import type { FlyerValues, OverlayValues, ParticleValues } from './occasion-theme.types';

const { particle, flyer, overlay } = LAYER_DEFAULTS;

/** A gentle fall of sparks in the look's colour — something to shape from. */
export const newParticle = (seed: string): ParticleValues => ({
  shapes: ['SPARK'],
  custom_paths: '',
  colors: [seed],
  motion: 'FALL',
  count: particle.count,
  size: [particle.size[0], particle.size[1]],
  speed: particle.speed,
  opacity: particle.opacity,
});

/** A shooting star crossing the top of the screen. */
export const newFlyer = (): FlyerValues => ({
  artwork: 'SHOOTING_STAR',
  custom_layers: [],
  image_url: '',
  direction: 'LTR',
  altitude: [flyer.altitude[0], flyer.altitude[1]],
  size: flyer.size,
  duration: flyer.duration,
  interval: flyer.interval,
  bob: flyer.bob,
  trail_color: '',
});

/** A warm glow down from the top, in the look's colour. */
export const newOverlay = (seed: string): OverlayValues => ({ style: 'GLOW_TOP', color: seed, opacity: overlay.opacity });
