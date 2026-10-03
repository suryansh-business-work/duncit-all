import { useEffect, useId, useState } from 'react';
import { Slider, Stack, Typography } from '@mui/material';

import { useMoney } from '../../../lib/money';
import { useStoreT } from '../../../i18n';

interface PriceFilterProps {
  /** The range the current results span, from the search. */
  floor: number;
  ceiling: number;
  max: number | null;
  onCommit: (min: number | null, max: number | null) => void;
}

/** A max-price slider: it starts at the highest price and is dragged down; applies when released. */
export function PriceFilter({ floor, ceiling, max, onCommit }: Readonly<PriceFilterProps>) {
  const { t } = useStoreT();
  const money = useMoney();
  const headingId = useId();
  const low = Math.floor(floor);
  const high = Math.max(Math.ceil(ceiling), low + 1);
  const [value, setValue] = useState<number>(max ?? high);
  useEffect(() => setValue(max ?? high), [max, high]);
  if (ceiling <= 0) return null;
  return (
    <Stack spacing={1}>
      <Typography id={headingId} variant="subtitle1" sx={{ fontWeight: 800 }}>
        {t('ecommStore.filters.price')}
      </Typography>
      <Slider
        value={value}
        min={low}
        max={high}
        onChange={(_event, next) => setValue(next as number)}
        onChangeCommitted={(_event, next) => {
          const to = next as number;
          onCommit(null, to < high ? to : null);
        }}
        aria-label={t('ecommStore.filters.maxPrice')}
        getAriaValueText={(amount) => money(amount)}
        sx={{ mx: 1, width: 'auto' }}
      />
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2">{money(low)}</Typography>
        <Typography variant="body2">{money(value)}</Typography>
      </Stack>
    </Stack>
  );
}
