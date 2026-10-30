import { Chip, Stack } from '@mui/material';

import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

interface DiscountTiersProps {
  tiers: readonly number[];
  min: number | null;
  onChange: (min: number | null) => void;
}

const chipSx = (selected: boolean) => ({
  minHeight: 44,
  px: 1,
  fontWeight: 800,
  bgcolor: selected ? T.navBar : T.surface,
  color: selected ? T.onBrand : T.ink,
  border: 1,
  borderColor: selected ? T.navBar : T.border,
  '&:hover, &.Mui-focusVisible': { bgcolor: selected ? T.navBar : T.surface },
});

/** "All deals", "10%+ off" and so on: toggles (aria-pressed) that set `?min=` in the URL. */
export function DiscountTiers({ tiers, min, onChange }: Readonly<DiscountTiersProps>) {
  const { t } = useStoreT();
  if (tiers.length === 0) return null;
  return (
    <Stack
      component="ul"
      direction="row"
      aria-label={t('ecommStore.flash.chooseDiscount')}
      sx={{ listStyle: 'none', p: 0, m: 0, gap: 1, flexWrap: 'wrap' }}
    >
      <li>
        <Chip label={t('ecommStore.deals.all')} clickable aria-pressed={min === null} onClick={() => onChange(null)} sx={chipSx(min === null)} />
      </li>
      {tiers.map((pct) => (
        <li key={pct}>
          <Chip
            label={t('ecommStore.deals.tier', { vars: { pct } })}
            clickable
            aria-pressed={min === pct}
            onClick={() => onChange(pct)}
            sx={chipSx(min === pct)}
          />
        </li>
      ))}
    </Stack>
  );
}
