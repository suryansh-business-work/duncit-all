/**
 * The photo wall leans toward the pointer: each column slides by `--earn-px`
 * times its depth, so near and far columns move at different speeds. Skipped
 * for touch (there is no hover to follow) and for anyone who asked for less
 * motion.
 */
const MAX_SHIFT_PX = 6;

export function bindEarnShowcaseParallax(section: HTMLElement): void {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reducedMotion) return;

  section.addEventListener('pointermove', (event) => {
    const rect = section.getBoundingClientRect();
    const fromCentre = (event.clientX - rect.left) / rect.width - 0.5;
    section.style.setProperty('--earn-px', (fromCentre * 2 * MAX_SHIFT_PX).toFixed(2));
  });
  section.addEventListener('pointerleave', () => {
    section.style.setProperty('--earn-px', '0');
  });
}
