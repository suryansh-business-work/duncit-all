/**
 * The one theme pair every highlighted block on this site is rendered with.
 *
 * Two callers need it and they must agree: `astro.config.mjs` (every fenced
 * block in a package's MDX) and `components/Preview.astro` (the `?raw` source
 * under a live example). If they drifted, a page would show two different
 * palettes on the same screen.
 *
 * Rendering BOTH themes is what lets the light/dark toggle be a CSS swap —
 * Shiki writes the light colours inline and the dark ones as `--shiki-dark*`
 * custom properties, and `styles/code.css` picks between them.
 *
 * `.mjs` rather than `.ts` so `astro.config.mjs` can import it directly.
 */
export const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' };
