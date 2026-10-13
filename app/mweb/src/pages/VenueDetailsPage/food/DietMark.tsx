import type { ComponentType } from 'react';
import { Box } from '@mui/material';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import CircleIcon from '@mui/icons-material/Circle';
import EggIcon from '@mui/icons-material/Egg';
import SpaIcon from '@mui/icons-material/Spa';
import { FOOD_DIET_KEYS, type VenueFoodDiet } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

const MARKS: Record<VenueFoodDiet, { Icon: ComponentType<SvgIconProps>; color: string }> = {
  VEG: { Icon: CircleIcon, color: 'success.main' },
  VEGAN: { Icon: SpaIcon, color: 'success.main' },
  EGG: { Icon: EggIcon, color: 'warning.main' },
  NON_VEG: { Icon: CircleIcon, color: 'error.main' },
};

/**
 * The boxed mark Indian menus print beside a dish — green for vegetarian, red
 * for non-vegetarian — with an egg and a leaf for the two it does not cover.
 * Colour is never the only signal: the mark carries the diet as its name.
 */
export default function DietMark({ diet }: Readonly<{ diet: VenueFoodDiet }>) {
  const { t } = useTranslation();
  const { Icon, color } = MARKS[diet] ?? MARKS.VEG;
  const label = t(FOOD_DIET_KEYS[diet] ?? FOOD_DIET_KEYS.VEG);
  return (
    <Box
      role="img"
      aria-label={label}
      title={label}
      data-testid={`food-diet-${diet}`}
      sx={{
        width: 18,
        height: 18,
        flex: '0 0 auto',
        display: 'grid',
        placeItems: 'center',
        border: 1.5,
        borderColor: 'currentColor',
        borderRadius: 0.25,
        color,
      }}
    >
      <Icon aria-hidden sx={{ fontSize: 10 }} />
    </Box>
  );
}
