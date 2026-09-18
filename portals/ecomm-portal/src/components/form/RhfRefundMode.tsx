import { useId } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormControl, FormControlLabel, FormHelperText, FormLabel, Radio, RadioGroup } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { REFUND_MODE_KEYS, type RefundMode } from '../../lib/status';

interface RhfRefundModeProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  /** A guest has no Duncit Coins balance, so coins are not offered. */
  isGuest: boolean;
}

const REFUND_MODES: readonly RefundMode[] = ['ORIGINAL', 'COINS'];

/** How money goes back: to the original payment (paid out by Finance), or at once as Duncit Coins. */
export default function RhfRefundMode<T extends FieldValues>({ control, name, isGuest }: Readonly<RhfRefundModeProps<T>>) {
  const { t } = useTranslation();
  const labelId = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormControl>
          <FormLabel id={labelId}>{t('ecommPortal.returns.refundMode')}</FormLabel>
          <RadioGroup aria-labelledby={labelId} value={field.value} onChange={(_event, value) => field.onChange(value)}>
            {REFUND_MODES.map((mode) => (
              <FormControlLabel
                key={mode}
                value={mode}
                control={<Radio />}
                label={t(REFUND_MODE_KEYS[mode])}
                disabled={mode === 'COINS' && isGuest}
              />
            ))}
          </RadioGroup>
          {isGuest && <FormHelperText>{t('ecommPortal.orders.guestNoCoins')}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}
