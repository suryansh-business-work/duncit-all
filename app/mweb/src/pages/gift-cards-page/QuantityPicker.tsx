import { Card, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { DuncitIconButton } from '@duncit/buttons';
import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';

interface QuantityPickerProps {
  /** The raw entry, so an emptied box stays empty while the buyer types. */
  value: string;
  max: number;
  error?: string;
  onChange: (next: string) => void;
}

/** How many cards — each worth the chosen amount — from 1 to the policy's maximum. */
export default function QuantityPicker({ value, max, error, onChange }: Readonly<QuantityPickerProps>) {
  const { t } = useTranslation();
  const n = Number.parseInt(value, 10);
  const current = Number.isFinite(n) ? n : 1;
  const step = (by: number) => onChange(String(Math.min(max, Math.max(1, current + by))));

  return (
    <Card data-testid="gift-card-quantity-picker" sx={{ p: 2 }}>
      <SectionHeader testId="gift-card-quantity-header" title={t('mweb.giftCards.quantityHeading')} />
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', mt: 1.5 }}>
        <DuncitIconButton
          data-testid="gift-card-quantity-minus"
          aria-label={t('mweb.giftCards.quantityLess')}
          disabled={current <= 1}
          onClick={() => step(-1)}
        >
          <RemoveIcon />
        </DuncitIconButton>
        <TextField
          data-testid="gift-card-quantity"
          label={t('mweb.giftCards.quantityLabel')}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          error={!!error}
          helperText={error ?? t('mweb.giftCards.quantityHint', { vars: { max } })}
          sx={{ flex: 1 }}
          slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'gift-card-quantity-input' } }}
        />
        <DuncitIconButton
          data-testid="gift-card-quantity-plus"
          aria-label={t('mweb.giftCards.quantityMore')}
          disabled={current >= max}
          onClick={() => step(1)}
        >
          <AddIcon />
        </DuncitIconButton>
      </Stack>
    </Card>
  );
}
