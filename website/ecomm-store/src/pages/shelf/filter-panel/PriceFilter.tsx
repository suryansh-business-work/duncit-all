import { useEffect, useId, useState } from 'react';
import { Slider, Stack, Typography } from '@mui/material';

import { useMoney } from '../../../lib/money';
import { useStoreT } from '../../../i18n';

interface PriceFilterProps {
  /** The range the current results span, from the search. */
  floor: number;
  ceiling: number;
  min: number | null;
  max: number | null;
  onCommit: (min: number | null, max: number | null) => void;
}

/** A two-thumb price slider that applies when a thumb is released. */
export function PriceFilter({ floor, ceiling, min, max, onCommit }: Readonly<PriceFilterProps>) {
  const { t } = useStoreT();
  const money = useMoney();
  const headingId = useId();
  const low = Math.floor(floor);
  const high = Math.max(Math.ceil(ceiling), low + 1);
  const [value, setValue] = useState<number[]>([min ?? low, max ?? high]);
  useEffect(() => setValue([min ?? low, max ?? high]), [min, max, low, high]);
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
        onChange={(_event, next) => setValue(next as number[])}
        onChangeCommitted={(_event, next) => {
          const [from, to] = next as number[];
          onCommit(from > low ? from : null, to < high ? to : null);
        }}
        getAriaLabel={(index) => (index === 0 ? t('ecommStore.filters.minPrice') : t('ecommStore.filters.maxPrice'))}
        getAriaValueText={(amount) => money(amount)}
        aria-labelledby={headingId}
        sx={{ mx: 1, width: 'auto' }}
      />
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2">{money(value[0] ?? low)}</Typography>
        <Typography variant="body2">{money(value[1] ?? high)}</Typography>
      </Stack>
    </Stack>
  );
}
