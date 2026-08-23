/**
 * Test double for `lottie-react`.
 *
 * The real package pulls in `lottie-web`, which reaches for canvas
 * `getContext` at IMPORT time. jsdom has no canvas, so the import throws
 * "Cannot set properties of null" and every module that transitively reaches
 * it dies before a single line of it is measured — eight of mWeb's modules,
 * including `App.tsx`, `PodDetailsPage` and the whole checkout chain.
 *
 * Two suites already carried their own `vi.mock('lottie-react', …)` for
 * exactly this reason. Aliasing it once in `vitest.config.ts` is the same fix
 * applied where every suite gets it (rule 34), rather than a copy per file
 * that the next page to render an animation will forget.
 *
 * An animation has no assertable behaviour in jsdom — it paints frames to a
 * canvas — so rendering nothing loses no coverage that was ever reachable.
 */
export default function Lottie(): null {
  return null;
}

export const useLottie = () => ({ View: null });
export const useLottieInteractivity = () => ({ View: null });
