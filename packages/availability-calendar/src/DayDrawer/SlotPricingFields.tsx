import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { SLOT_PRICING_MODES, SLOT_PRICING_MODE_KEY, slotPricingModeOf, type SlotDraft } from '@duncit/slots';

const PRICE_INPUT_TEST_ID: { 'data-testid': string } = { 'data-testid': 'add-slot-price-input' };
const OVERTIME_INPUT_TEST_ID: { 'data-testid': string } = { 'data-testid': 'add-slot-overtime-input' };

interface Props {
  draft: Pick<SlotDraft, 'price' | 'pricingMode' | 'overtimeRate'>;
  patch: (p: Partial<SlotDraft>) => void;
}

/**
 * How the venue charges for the slot: the price, whether it covers the slot,
 * each hour of it or each guest, and the rate for each hour past its end.
 */
export default function SlotPricingFields({ draft, patch }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <TextField
        select
        size="small"
        label={t('availability.pricingMode')}
        value={draft.pricingMode}
        onChange={(e) => patch({ pricingMode: slotPricingModeOf(e.target.value) })}
        helperText={draft.pricingMode === 'PER_PAX' ? t('availability.pricingHint') : undefined}
        data-testid="add-slot-pricing-mode"
      >
        {SLOT_PRICING_MODES.map((mode) => (
          <MenuItem key={mode} value={mode}>
            {t(SLOT_PRICING_MODE_KEY[mode])}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        size="small"
        type="number"
        label={t('availability.price')}
        value={draft.price}
        onChange={(e) => patch({ price: e.target.value })}
        helperText={t('availability.priceHint')}
        data-testid="add-slot-price"
        slotProps={{ htmlInput: { min: 0, step: 50, ...PRICE_INPUT_TEST_ID } }}
      />
      <TextField
        size="small"
        type="number"
        label={t('availability.overtimeRate')}
        value={draft.overtimeRate}
        onChange={(e) => patch({ overtimeRate: e.target.value })}
        helperText={t('availability.overtimeHint')}
        data-testid="add-slot-overtime"
        slotProps={{ htmlInput: { min: 0, step: 50, ...OVERTIME_INPUT_TEST_ID } }}
      />
    </>
  );
}
