import { useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
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
    <SurfaceCard gap={16} testID="venue-settings-form">
      <SectionHeader title={t('venueSettings.cancellationTitle')} />
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
        <Text testID="venue-settings-policy-disabled" fontSize={13} color="$muted">
          {t('venueSettings.policyDisabled')}
        </Text>
      ) : null}
      <YStack height={1} backgroundColor="$borderColor" />
      <YStack gap={2}>
        <Text fontSize={15} fontWeight="600" color="$color">
          {t('venueSettings.bandsTitle')}
        </Text>
        <Text fontSize={12} color="$muted">
          {t('venueSettings.bandsHint')}
        </Text>
      </YStack>
      {fields.length === 0 ? (
        <Text testID="venue-settings-no-bands" fontSize={14} color="$muted">
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
          tone="neutral"
          disabled={rescheduleOnly}
        />
      </XStack>
      {error ? (
        <Text testID="venue-settings-error" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      {saved ? (
        <Text testID="venue-settings-saved" fontSize={13} color="$success">
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
    </SurfaceCard>
  );
}
