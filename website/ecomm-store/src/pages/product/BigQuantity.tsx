import { Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';

import { CircleButton } from '../../components/CircleButton';
import { useMoney } from '../../lib/money';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

interface BigQuantityProps {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  price: number;
  mrp: number;
  discountPct: number;
}

/** The mock's big "02" between round −/+ buttons, over a dark price pill. */
export function BigQuantity({ value, min, max, onChange, price, mrp, discountPct }: Readonly<BigQuantityProps>) {
  const { t } = useStoreT();
  const money = useMoney();
  const reduced = mrp > price;
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 360 }} role="group" aria-label={t('ecommStore.qty.label')}>
        <CircleButton aria-label={t('ecommStore.qty.less')} disabled={value <= min} onClick={() => onChange(value - 1)} sx={{ width: 52, height: 52 }}>
          <RemoveRoundedIcon />
        </CircleButton>
        <Typography component="output" aria-live="polite" sx={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>
          {String(value).padStart(2, '0')}
        </Typography>
        <CircleButton aria-label={t('ecommStore.qty.more')} disabled={value >= max} onClick={() => onChange(value + 1)} sx={{ width: 52, height: 52 }}>
          <AddRoundedIcon />
        </CircleButton>
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Typography sx={{ bgcolor: T.navBar, color: T.onBrand, borderRadius: T.radius.pill, px: 2.5, py: 0.75, fontWeight: 800, fontSize: '1.1rem' }}>
          {money(price)}
        </Typography>
        {reduced ? (
          <Typography component="s" color="text.secondary" aria-label={t('ecommStore.price.wasNamed', { vars: { price: money(mrp) } })}>
            {money(mrp)}
          </Typography>
        ) : null}
        {reduced && discountPct > 0 ? (
          <Typography color="success.main" sx={{ fontWeight: 800 }}>
            {t('ecommStore.price.off', { vars: { pct: discountPct } })}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
