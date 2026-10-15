import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '@duncit/auth-tokens';
import { fitScale, fitSize } from '@duncit/utils';

const FIT = auth.fit;

export interface AuthFit {
  /** `auth.fit.minScale`…`maxScale` — how far this window shrinks the design. */
  scale: number;
  /** A design size at this window's scale, never under `floor`. */
  size: (base: number, floor?: number) => number;
}

/**
 * Fits the auth screen to the window so the login landing needs no scroll:
 * the window height inside the safe area (status bar and nav bar out),
 * against the landing's design height, with only its flexible part — the
 * hero, the heading, the gaps — shrinking (`fitScale`). Buttons, chips and
 * the social row keep their size and touch targets. A window still too short
 * at `minScale`, a large accessibility font, or the keyboard falls back to the
 * scaffold's scroll. Read by AuthScaffold and the landing step alike, so both
 * spend the same number.
 */
export function useAuthFit(): AuthFit {
  const { height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const scale = fitScale(
    height - top - bottom,
    FIT.designHeight,
    FIT.minScale,
    FIT.maxScale,
    FIT.fixedHeight,
  );
  return { scale, size: (base, floor) => fitSize(base, scale, floor) };
}
