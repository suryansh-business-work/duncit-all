import { Box, Chip, Stack, TextField, Typography } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { GiftCardSettings } from './queries';

interface AmountPickerProps {
  settings: GiftCardSettings;
  currencySymbol: string;
  /** The raw entry — chips write into it too, so there is ONE amount source. */
  amountStr: string;
  onChange: (next: string) => void;
}

/** Denomination chips from Finance > Gift Cards, plus a custom amount bounded
 * by the configured min/max. */
export default function AmountPicker({ settings, currencySymbol, amountStr, onChange }: Readonly<AmountPickerProps>) {
  const { t } = useTranslation();
  const amount = Number.parseInt(amountStr, 10);
  const inRange = Number.isFinite(amount) && amount >= settings.min_amount && amount <= settings.max_amount;
  const showError = amountStr.trim() !== '' && !inRange;
  const rangeHint = t('mweb.giftCards.amountRangeHint', {
    vars: {
      min: formatMoney(settings.min_amount, { symbol: currencySymbol }),
      max: formatMoney(settings.max_amount, { symbol: currencySymbol }),
    },
  });

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700}>
        {t('mweb.giftCards.amountHeading')}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
        {settings.denominations.map((denomination) => {
          const active = amount === denomination;
          return (
            <Chip
              key={denomination}
              label={formatMoney(denomination, { symbol: currencySymbol })}
              color={active ? 'primary' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              onClick={() => onChange(String(denomination))}
            />
          );
        })}
      </Stack>
      <TextField
        fullWidth
        type="number"
        label={t('mweb.giftCards.customAmountLabel')}
        value={amountStr}
        onChange={(event) => onChange(event.target.value)}
        error={showError}
        helperText={rangeHint}
        inputProps={{ min: settings.min_amount, max: settings.max_amount, inputMode: 'numeric' }}
        sx={{ mt: 1.5 }}
      />
    </Box>
  );
}
