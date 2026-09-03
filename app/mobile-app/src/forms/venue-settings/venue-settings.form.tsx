import { useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { CancellationTierRow } from './CancellationTierRow';
import {
  emptyTier,
  makeVenueSettingsSchema,
  toPolicyValues,
  type CancellationPolicyValues,
  type VenueCancellationPolicy,
} from './venue-settings.types';

export interface VenueSettingsFormProps {
  /** The venue's current policy; a venue with none yet edits an empty one. */
  policy: VenueCancellationPolicy | null;
  saving: boolean;
  saved: boolean;
  error: string | null;
  onSubmit: (values: CancellationPolicyValues) => void;
}

/**
 * The cancellation policy form — the Tamagui twin of the MUI form mWeb and
 * the Partners console render (rule 27). The bands are held even while
 * reschedule-only is on: that switch makes them inapplicable, not wrong, so
 * turning it back off restores what the owner already wrote.
 */
export function VenueSettingsForm({
  policy,
  saving,
  saved,
  error,
  onSubmit,
}: Readonly<VenueSettingsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVenueSettingsSchema(t), [t]);
  const { control, handleSubmit, watch } = useForm<
    CancellationPolicyValues,
    any,
    CancellationPolicyValues
  >({
    resolver: formResolver<CancellationPolicyValues>(schema),
    defaultValues: toPolicyValues(policy),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'tiers' });
  const rescheduleOnly = watch('reschedule_only');
  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <YStack gap={14} testID="venue-settings-form">
      <Text fontSize={16} fontWeight="700" color="$color">
        {t('venueSettings.cancellationTitle')}
      </Text>
      <Controller
        control={control}
        name="reschedule_only"
        render={({ field }) => (
          <ToggleRow
            testID="venue-settings-reschedule-only"
            label={t('venueSettings.rescheduleOnly')}
            hint={t('venueSettings.rescheduleOnlyHint')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      {rescheduleOnly ? (
        <Text testID="venue-settings-policy-disabled" fontSize={12.5} color="$muted">
          {t('venueSettings.policyDisabled')}
        </Text>
      ) : null}
      <YStack gap={2}>
        <Text fontSize={14} fontWeight="700" color="$color">
          {t('venueSettings.bandsTitle')}
        </Text>
        <Text fontSize={12} color="$muted">
          {t('venueSettings.bandsHint')}
        </Text>
      </YStack>
      {fields.length === 0 ? (
        <Text testID="venue-settings-no-bands" fontSize={13} color="$muted">
          {t('venueSettings.noBands')}
        </Text>
      ) : null}
      {fields.map((field, index) => (
        <CancellationTierRow
          key={field.id}
          index={index}
          control={control}
          disabled={rescheduleOnly}
          onRemove={() => remove(index)}
        />
      ))}
      <XStack>
        <DuncitButton
          testID="venue-settings-add-band"
          label={t('venueSettings.addBand')}
          onPress={() => append({ ...emptyTier })}
          variant="outline"
          size="sm"
          disabled={rescheduleOnly}
        />
      </XStack>
      {error ? (
        <Text testID="venue-settings-error" fontSize={12.5} color="$danger">
          {error}
        </Text>
      ) : null}
      {saved ? (
        <Text testID="venue-settings-saved" fontSize={12.5} color="$success">
          {t('venueSettings.saved')}
        </Text>
      ) : null}
      <PrimaryButton
        testID="venue-settings-save"
        label={saving ? t('venueSettings.saving') : t('venueSettings.save')}
        onPress={() => {
          submit().catch(() => undefined);
        }}
        disabled={saving}
        loading={saving}
      />
    </YStack>
  );
}
