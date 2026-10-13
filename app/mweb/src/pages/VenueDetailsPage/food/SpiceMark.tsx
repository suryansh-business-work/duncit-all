import { Stack } from '@mui/material';
import FireIcon from '@mui/icons-material/LocalFireDepartment';
import { FOOD_SPICE_HEAT, FOOD_SPICE_KEYS, type VenueFoodSpiceLevel } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';

/** One id per flame a dish can show, so the row has stable keys. */
const FLAMES = ['mild', 'medium', 'hot', 'extra-hot'] as const;

/** How hot a dish is, as one to four flames. A dish with no heat shows nothing. */
export default function SpiceMark({ level }: Readonly<{ level: VenueFoodSpiceLevel }>) {
  const { t } = useTranslation();
  const heat = FOOD_SPICE_HEAT[level] ?? 0;
  if (heat === 0) return null;
  const label = t(FOOD_SPICE_KEYS[level]);
  return (
    <Stack
      direction="row"
      role="img"
      aria-label={label}
      title={label}
      data-testid={`food-spice-${level}`}
      sx={{ color: 'error.main', alignItems: 'center' }}
    >
      {FLAMES.slice(0, heat).map((flame) => (
        <FireIcon key={flame} aria-hidden sx={{ fontSize: 14 }} />
      ))}
    </Stack>
  );
}
