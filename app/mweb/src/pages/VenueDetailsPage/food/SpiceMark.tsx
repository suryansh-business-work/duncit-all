import { Stack, Typography } from '@mui/material';
import FireIcon from '@mui/icons-material/LocalFireDepartment';
import { FOOD_SPICE_HEAT, FOOD_SPICE_KEYS, type VenueFoodSpiceLevel } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

/** One id per flame a dish can show, so the row has stable keys. */
const FLAMES = ['mild', 'medium', 'hot', 'extra-hot'] as const;

interface Props {
  level: VenueFoodSpiceLevel;
  /** Say "Not spicy" for a dish with no heat — the dish page does; the menu card stays quiet. */
  showNone?: boolean;
}

/**
 * How hot a dish is: one to four flames and the level in words. A dish with
 * no heat shows nothing unless `showNone` asks for its "Not spicy" line.
 */
export default function SpiceMark({ level, showNone = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const heat = FOOD_SPICE_HEAT[level] ?? 0;
  if (heat === 0 && !showNone) return null;
  return (
    <Stack
      direction="row"
      spacing={0.25}
      data-testid={`food-spice-${level}`}
      sx={{ color: heat ? 'error.main' : 'text.secondary', alignItems: 'center' }}
    >
      {FLAMES.slice(0, heat).map((flame) => (
        <FireIcon key={flame} aria-hidden sx={{ fontSize: 14 }} />
      ))}
      <Typography component="span" variant="caption" sx={{ color: 'inherit', fontWeight: 600, pl: heat ? 0.25 : 0 }}>
        {t(FOOD_SPICE_KEYS[level])}
      </Typography>
    </Stack>
  );
}
