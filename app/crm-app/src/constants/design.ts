import { light, radii } from '@duncit/auth-tokens';

/** The shared corner radii (@duncit/auth-tokens): `lg` for cards, `pill` for fields and round buttons. */
export const RADII = radii;

/**
 * The portal login card's "ink" call-to-action (submit button, tagline bar):
 * deliberately the same in light and dark mode, as on the portal — the light
 * palette's ink under its surface colour.
 */
export const INK = { fill: light.ink, on: light.surface } as const;
