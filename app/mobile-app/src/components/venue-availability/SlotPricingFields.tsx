import {
  SLOT_PRICING_MODES,
  SLOT_PRICING_MODE_KEY,
  slotPricingModeOf,
  type SlotDraft,
} from '@duncit/slots';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { LabeledInput } from '@/components/LabeledInput';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  draft: Pick<SlotDraft, 'price' | 'pricingMode' | 'overtimeRate'>;
  patch: (p: Partial<SlotDraft>) => void;
}

/**
 * How the venue charges for the slot: the price, whether it covers the slot,
 * each hour of it or each guest, and the rate for each hour past its end.
 * RN twin of the availability calendar's SlotPricingFields.
 */
export function SlotPricingFields({ draft, patch }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <ChipSelectField
        testID="add-slot-pricing-mode"
        label={t('availability.pricingMode')}
        hint={draft.pricingMode === 'PER_PAX' ? t('availability.pricingHint') : undefined}
        options={SLOT_PRICING_MODES.map((mode) => ({
          value: mode,
          label: t(SLOT_PRICING_MODE_KEY[mode]),
        }))}
        value={draft.pricingMode}
        onChange={(mode) => patch({ pricingMode: slotPricingModeOf(mode) })}
      />
      <LabeledInput
        testID="add-slot-price"
        label={t('availability.price')}
        hint={t('availability.priceHint')}
        value={draft.price}
        onChangeText={(next) => patch({ price: next })}
        keyboardType="numeric"
      />
      <LabeledInput
        testID="add-slot-overtime"
        label={t('availability.overtimeRate')}
        hint={t('availability.overtimeHint')}
        value={draft.overtimeRate}
        onChangeText={(next) => patch({ overtimeRate: next })}
        keyboardType="numeric"
      />
    </>
  );
}
