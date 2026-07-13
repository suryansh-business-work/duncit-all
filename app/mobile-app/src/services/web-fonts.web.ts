/**
 * Loads the brand web font (Quicksand) the same way mWeb does — via the Google
 * Fonts stylesheet — so type renders identically across web and mWeb. Native has
 * a no-op counterpart in `web-fonts.ts` (it would bundle the font via expo-font).
 * Idempotent: the stylesheet is injected at most once.
 */
const FONT_STYLESHEET_HREF =
  'https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap';

export function loadWebFonts(): void {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-duncit-font]')) return;

  const preconnectApi = document.createElement('link');
  preconnectApi.rel = 'preconnect';
  preconnectApi.href = 'https://fonts.googleapis.com';

  const preconnectStatic = document.createElement('link');
  preconnectStatic.rel = 'preconnect';
  preconnectStatic.href = 'https://fonts.gstatic.com';
  preconnectStatic.crossOrigin = 'anonymous';

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = FONT_STYLESHEET_HREF;
  stylesheet.dataset.duncitFont = 'quicksand';

  document.head.append(preconnectApi, preconnectStatic, stylesheet);
}
