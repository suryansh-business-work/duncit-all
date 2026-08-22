import { useEffect, useRef, useState } from 'react';

/**
 * True once the element has been scrolled anywhere near the viewport, and true
 * for good afterwards.
 *
 * A package doc runs to thirty fenced blocks and every one of them is a Monaco
 * editor, so mounting them all at once buys thirty models, thirty layout passes
 * and a page that stutters before a word is read. Mounting on approach costs
 * one observer and keeps the editors a reader never reaches from ever existing.
 */
export function useLazyVisible<T extends HTMLElement>(rootMargin = '400px') {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return undefined;
    // No IntersectionObserver (jsdom, a very old browser) means every block
    // mounts — degraded, never blank.
    if (!('IntersectionObserver' in globalThis)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return { ref, visible };
}
