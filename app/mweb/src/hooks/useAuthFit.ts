import { useEffect, useState } from 'react';
import { auth } from '@duncit/auth-tokens';
import { fitScale, fitSize } from '@duncit/utils';

const FIT = auth.fit;

export interface AuthFit {
  /** `auth.fit.minScale`…`maxScale` — how far this viewport shrinks the design. */
  scale: number;
  /** A design size at this viewport's scale, never under `floor`. */
  size: (base: number, floor?: number) => number;
}

/**
 * Fits the auth screen to the viewport so the login landing needs no scroll:
 * the viewport height against the landing's design height, with only its
 * flexible part — the hero, the heading, the gaps — shrinking (`fitScale`).
 * Buttons, chips and the social row keep their size. What still does not fit
 * scrolls inside AuthBackground. Native twin: components/AuthScaffold/useAuthFit.
 */
export function useAuthFit(): AuthFit {
  // NaN (no window yet) reads as "nothing to measure" — the design as drawn.
  const [height, setHeight] = useState(() => globalThis.innerHeight ?? Number.NaN);

  useEffect(() => {
    const measure = () => setHeight(globalThis.innerHeight);
    measure();
    globalThis.addEventListener('resize', measure);
    return () => globalThis.removeEventListener('resize', measure);
  }, []);

  const scale = fitScale(height, FIT.designHeight, FIT.minScale, FIT.maxScale, FIT.fixedHeight);
  return { scale, size: (base, floor) => fitSize(base, scale, floor) };
}
