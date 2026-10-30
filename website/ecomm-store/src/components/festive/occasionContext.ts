import { createContext, useContext } from 'react';

import type { StoreOccasionTheme } from '../../graphql/settings';
import type { OccasionLook } from '../../theme/occasions';

export interface OccasionValue {
  /** The look on screen: a preview, else the live occasion's, else NONE. */
  theme: StoreOccasionTheme;
  /** Null for NONE (the house look). */
  look: OccasionLook | null;
  /** The live occasion's festive line, '' for none. */
  greeting: string;
  /** The animation may play here (a look with effects on, and no reduced-motion request). */
  canAnimate: boolean;
  /** ...and the shopper has not paused it. */
  effectsOn: boolean;
}

export const NO_OCCASION: OccasionValue = { theme: 'NONE', look: null, greeting: '', canAnimate: false, effectsOn: false };

export const OccasionContext = createContext<OccasionValue>(NO_OCCASION);

/** The festive look the store wears right now, and whether its animation plays. */
export const useOccasion = (): OccasionValue => useContext(OccasionContext);
