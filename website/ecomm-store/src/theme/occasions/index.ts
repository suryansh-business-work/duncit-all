import type { StoreOccasionTheme } from '../../graphql/settings';
import { INDIAN_LOOKS } from './indian';
import { NATIONAL_LOOKS } from './national';
import type { FestiveTheme, OccasionLook } from './types';
import { WESTERN_LOOKS } from './western';

/** Every festive look the store ships, keyed by the server's theme enum. */
export const OCCASION_LOOKS: Record<FestiveTheme, OccasionLook> = { ...INDIAN_LOOKS, ...WESTERN_LOOKS, ...NATIONAL_LOOKS };

/** A theme name this build knows a look for (a newer server enum value is not one). */
export function isFestiveTheme(value: string): value is FestiveTheme {
  return Object.hasOwn(OCCASION_LOOKS, value);
}

/** The look for a theme; null for NONE or a theme this build does not know. */
export function lookFor(theme: StoreOccasionTheme): OccasionLook | null {
  return isFestiveTheme(theme) ? OCCASION_LOOKS[theme] : null;
}

export { PARTICLE_PATHS } from './shapes';
export type { FestiveTheme, OccasionEffect, OccasionLook, ParticleMotion, ParticleShape } from './types';
