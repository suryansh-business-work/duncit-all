import { useWatch, type Control } from 'react-hook-form';
import { isHexColor } from '@duncit/regex';
import { HOUSE_PALETTES } from '../preview/palette';
import type { OccasionThemeFormValues } from './occasion-theme.types';

/**
 * The colour a new particle, firework or wash starts in: the look's own brand
 * colour, else the house one — so a new layer already belongs to the look.
 */
export function useSeedColor(control: Control<OccasionThemeFormValues>): string {
  const brand = useWatch({ control, name: 'palette_light.brand' }).trim();
  return isHexColor(brand) ? brand : HOUSE_PALETTES.light.brand;
}
