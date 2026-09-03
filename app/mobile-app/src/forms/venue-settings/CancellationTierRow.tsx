import { Controller, type Control } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import type { CancellationPolicyValues } from './venue-settings.types';

interface Props {
  index: number;
  control: Control<CancellationPolicyValues>;
  /** Greyed while the venue is reschedule-only — the band is kept, not applied. */
  disabled: boolean;
  onRemove: () => void;
}

/** One band of the policy: within how many hours, charged how, how much. */
export function CancellationTierRow({ index, control, disabled, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const chargeOptions = [
    { value: 'PERCENT', label: t('venueSettings.chargePercent') },
    { value: 'AMOUNT', label: t('venueSettings.chargeAmount') },
  ];

  return (
    <YStack
      testID={`cancellation-tier-${index}`}
      gap={8}
      padding={10}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      opacity={disabled ? 0.5 : 1}
    >
      <XStack gap={8}>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name={`tiers.${index}.hours_before`}
            label={t('venueSettings.tierHours')}
            keyboardType="number-pad"
            digitsOnly
            editable={!disabled}
            required
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name={`tiers.${index}.value`}
            label={t('venueSettings.tierValue')}
            keyboardType="decimal-pad"
            editable={!disabled}
            required
          />
        </YStack>
      </XStack>
      <Controller
        control={control}
        name={`tiers.${index}.charge_type`}
        render={({ field }) => (
          <ChipSelectField
            testID={`cancellation-tier-${index}-charge`}
            label={t('venueSettings.tierChargeType')}
            options={chargeOptions}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <XStack justifyContent="flex-end">
        <DuncitButton
          testID={`cancellation-tier-${index}-remove`}
          label={t('venueSettings.removeTier')}
          onPress={onRemove}
          variant="ghost"
          tone="danger"
          size="sm"
          disabled={disabled}
        />
      </XStack>
    </YStack>
  );
}
