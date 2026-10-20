import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import { FeeFields } from './FeeFields';
import { OpeningHoursSection } from './OpeningHoursSection';
import { PricePreviewCard } from './PricePreviewCard';
import { PriceRulesSection } from './PriceRulesSection';
import { PricingSlotsSection } from './PricingSlotsSection';
import { RateFields } from './RateFields';
import { toPricingValues, type RegularHours, type SavedPricing } from './venue-pricing.mapping';
import { makeVenuePricingSchema, type VenuePricingValues } from './venue-pricing.types';

export interface VenuePricingFormProps {
  venueId: string;
  saved: SavedPricing;
  /** The venue's regular hours — where a new slot or a newly opened day starts. */
  regular: RegularHours;
  saving: boolean;
  savedOk: boolean;
  error: string | null;
  onSubmit: (values: VenuePricingValues) => void;
}

/**
 * The Venue Pricing Module form — the Tamagui twin of the Partner Portal's
 * MUI form: the model, its rate and limits, a PER_SLOT venue's slots, the
 * fees, the opening hours and the price rules, with the live server preview
 * under them. Single-date prices and blocked dates live on the calendar.
 */
export function VenuePricingForm({
  venueId,
  saved,
  regular,
  saving,
  savedOk,
  error,
  onSubmit,
}: Readonly<VenuePricingFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVenuePricingSchema(t), [t]);
  const { control, handleSubmit, watch, formState } = useForm<
    VenuePricingValues,
    any,
    VenuePricingValues
  >({
    resolver: formResolver<VenuePricingValues>(schema),
    defaultValues: toPricingValues(saved, regular),
  });
  const values = watch();
  const models = [
    { value: 'PER_PAX', label: t('availability.pricingModule.modelPerPax') },
    { value: 'PER_SLOT', label: t('availability.pricingModule.modelPerSlot') },
    { value: 'PER_HOUR', label: t('availability.pricingModule.modelPerHour') },
    { value: 'FLAT', label: t('availability.pricingModule.modelFlat') },
  ];
  const firstSlot = values.slots[0];
  const sampleWindow = firstSlot
    ? { start: firstSlot.start_time, end: firstSlot.end_time }
    : { start: regular.open, end: regular.close };
  const slotsError = formState.errors.slots?.message ?? formState.errors.slots?.root?.message;
  const submit = handleSubmit((valid) => onSubmit(valid));

  return (
    <YStack gap={16}>
      <SurfaceCard gap={16} testID="venue-pricing-form">
        <Controller
          control={control}
          name="model"
          render={({ field, fieldState }) => (
            <ChipSelectField
              testID="venue-pricing-model"
              label={t('availability.pricingModule.modelTitle')}
              options={models}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              required
            />
          )}
        />
        {values.model ? <RateFields control={control} model={values.model} /> : null}
        {values.model === 'PER_SLOT' ? (
          <PricingSlotsSection
            control={control}
            listError={slotsError}
            newSlot={{
              start_time: regular.open,
              end_time: regular.close,
              price: '',
              days_of_week: [],
            }}
          />
        ) : null}
        <FeeFields control={control} />
        <OpeningHoursSection control={control} />
        <PriceRulesSection control={control} />
        {error ? (
          <Text testID="venue-pricing-error" role="alert" fontSize={13} color="$danger">
            {error}
          </Text>
        ) : null}
        {savedOk ? (
          <Text testID="venue-pricing-saved" role="status" fontSize={13} color="$success">
            {t('availability.pricingModule.saved')}
          </Text>
        ) : null}
        <PrimaryButton
          testID="venue-pricing-save"
          label={
            saving ? t('availability.pricingModule.saving') : t('availability.pricingModule.save')
          }
          onPress={() => {
            submit().catch(() => undefined);
          }}
          disabled={saving}
          loading={saving}
        />
      </SurfaceCard>
      <PricePreviewCard
        values={values}
        schema={schema}
        venueId={venueId}
        saved={saved}
        sampleWindow={sampleWindow}
      />
    </YStack>
  );
}
