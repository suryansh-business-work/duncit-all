import { useMemo, useState } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { Spinner, Text } from 'tamagui';
import { logs } from '@duncit/logs';

import { PrimaryButton } from '@/components/PrimaryButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { FeeFields } from '@/forms/venue-pricing/FeeFields';
import {
  makeVenuePricingSchema,
  savedToInput,
  toPricingValues,
  type RegularHours,
  type SavedPricing,
  type VenuePricingValues,
} from '@/forms/venue-pricing';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenuePricing } from '@/hooks/useVenuePricing';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';

/** The only fields this card edits; the rest of the pricing goes back exactly as saved. */
const FEE_FIELDS: FieldPath<VenuePricingValues>[] = ['deposit', 'cleaning_fee', 'pet_fee', 'gst_enabled'];

/** The saved pricing with only the fees replaced — the server stores pricing whole. */
export function feesInput(saved: SavedPricing, values: VenuePricingValues) {
  return {
    ...savedToInput(saved),
    deposit: Number(values.deposit),
    cleaning_fee: Number(values.cleaning_fee),
    pet_fee: Number(values.pet_fee),
    gst_enabled: values.gst_enabled,
  };
}

function FeesForm({ saved, regular, onSave }: Readonly<{ saved: SavedPricing; regular: RegularHours; onSave: (values: VenuePricingValues) => Promise<void> }>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVenuePricingSchema(t), [t]);
  const form = useForm<VenuePricingValues, unknown, VenuePricingValues>({
    resolver: formResolver<VenuePricingValues>(schema),
    defaultValues: toPricingValues(saved, regular),
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setDone(false);
    setError(null);
    // Only the fees are checked: a venue without a pricing model can still set its fees.
    if (!(await form.trigger(FEE_FIELDS))) return;
    setSaving(true);
    try {
      await onSave(form.getValues());
      setDone(true);
    } catch (e) {
      setError(toErrorMessage(e, t('availability.pricingModule.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SurfaceCard gap={16} testID="venue-fees-card">
      <FeeFields control={form.control} />
      {error ? (
        <Text testID="venue-fees-error" role="alert" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      {done ? (
        <Text testID="venue-fees-saved" role="status" fontSize={13} color="$success">
          {t('availability.pricingModule.saved')}
        </Text>
      ) : null}
      <PrimaryButton
        testID="venue-fees-save"
        label={t('availability.pricingModule.save')}
        onPress={() => fireAndForget(submit())}
        disabled={saving}
        loading={saving}
      />
    </SurfaceCard>
  );
}

/**
 * Fees & Minimum Spend > Fees: the cleaning and pet fees, the deposit and GST
 * for the venue the switcher picked, saved on their own so the booking offers
 * beside them are never touched. mWeb / Partners twin: VenuePricingPartEditor.
 */
export function VenueFeesCard({ venueId, regular }: Readonly<{ venueId: string; regular: RegularHours }>) {
  const { t } = useTranslation();
  const { pricing, isLoading, error, save } = useVenuePricing(venueId);

  if (isLoading && !pricing) {
    return <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} testID="venue-fees-loading" color="$primary" />;
  }
  if (!pricing) {
    return (
      <Text testID="venue-fees-load-error" role="alert" fontSize={13} color="$danger">
        {error ?? t('availability.pricingModule.loadFailed')}
      </Text>
    );
  }
  return (
    <FeesForm
      saved={pricing}
      regular={regular}
      onSave={async (values) => {
        try {
          await save(feesInput(pricing, values));
        } catch (e) {
          logs.mobileApp.warn('venueFees', 'save', { error: e, venue_id: venueId });
          throw e;
        }
      }}
    />
  );
}
