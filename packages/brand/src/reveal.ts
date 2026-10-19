/**
 * Scroll reveal for every Duncit website (ScrollReveal.astro).
 *
 * Mark an element `data-reveal` (optionally `="up" | "fade" | "scale" | "left"
 * | "right"`) and it eases in the first time it scrolls into view. Children of
 * a `data-reveal-group` are staggered in document order.
 *
 * Nothing is hidden until this script has run: the `reveal-ready` class on
 * <html> is what arms the CSS, so a page with JavaScript off — or a visitor
 * who asked for less motion — sees everything at once.
 */
export const REVEAL_READY_CLASS = 'reveal-ready';
export const REVEALED_CLASS = 'is-revealed';
/** Milliseconds between siblings in a group, capped so long lists never crawl. */
export const STAGGER_MS = 80;
export const MAX_STAGGER_STEPS = 8;

export const staggerDelay = (index: number): number => Math.min(index, MAX_STAGGER_STEPS) * STAGGER_MS;

/** How long the ease-in runs; the inline transition is cleared after it. */
export const REVEAL_MS = 800;
const REVEAL_TRANSITION = `opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), translate ${REVEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1), scale ${REVEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;

/**
 * Ease one element in. The transition lives inline only while it plays and is
 * then removed, so the element's own hover transitions are never slowed or
 * delayed by the reveal afterwards.
 */
export function revealElement(el: HTMLElement): void {
  const delay = Number.parseInt(el.style.getPropertyValue('--reveal-delay') || '0', 10) || 0;
  el.style.transition = REVEAL_TRANSITION;
  el.style.transitionDelay = `${delay}ms`;
  el.classList.add(REVEALED_CLASS);
  globalThis.setTimeout(() => {
    el.style.transition = '';
    el.style.transitionDelay = '';
  }, REVEAL_MS + delay + 50);
}

export function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Arm and observe every reveal target under `root`. Returns a disconnect for tests and teardown. */
export function startReveal(root: ParentNode = document): () => void {
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return () => undefined;

  for (const group of root.querySelectorAll<HTMLElement>('[data-reveal-group]')) {
    [...group.querySelectorAll<HTMLElement>('[data-reveal]')].forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${staggerDelay(i)}ms`);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        revealElement(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  root.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
  document.documentElement.classList.add(REVEAL_READY_CLASS);
  return () => observer.disconnect();
}
