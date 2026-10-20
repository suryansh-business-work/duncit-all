import { useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { createLogger } from '@duncit/logs';
import { readVenueSettings } from '@duncit/slots';
import { Loader } from '@duncit/ui';
import type { EditorVenue } from '../VenueAvailabilityEditor';
import PricingCalendar from './calendar/PricingCalendar';
import { errorText } from './format';
import { VenuePricingForm, toFormValues, toPricingInput, type VenuePricingFormValues } from './form';
import PricingPreview from './preview/PricingPreview';
import { usePricingModule } from './usePricingModule';

const logger = createLogger('portal');

interface Props {
  venue: EditorVenue;
  /** Fired after a holiday changes the venue's own settings, so the host re-reads the venue. */
  onVenueChanged?: () => Promise<void> | void;
}

/**
 * The Venue Pricing Module — the venue's own price (model, rate, limits,
 * slots or hours, fees, rules), a live server preview of what a host pays and
 * what the venue receives, and the month calendar where one date can be
 * repriced, blocked or marked a holiday. Partners console and mWeb mount this
 * one component.
 */
export default function VenuePricingModule({ venue, onVenueChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const pricingModule = usePricingModule(venue.id);
  const [saveError, setSaveError] = useState<string | null>(null);
  const holidays = useMemo(() => readVenueSettings(venue.settings).holidays, [venue.settings]);
  const defaults = useMemo(() => toFormValues(pricingModule.pricing), [pricingModule.pricing]);

  if (pricingModule.loading) return <Loader size={24} sx={{ py: 4 }} />;
  if (!pricingModule.pricing) {
    return <Alert severity="error">{errorText(pricingModule.error, t('venuePricing.loadFailed'))}</Alert>;
  }
  const pricing = pricingModule.pricing;

  const submit = async (values: VenuePricingFormValues) => {
    setSaveError(null);
    try {
      // Blocked dates are edited on the calendar, so the latest saved list wins over the form's copy.
      await pricingModule.save({ ...toPricingInput(values), blocked_dates: pricing.blocked_dates });
      notifySuccess(t('venuePricing.saved'));
    } catch (error) {
      setSaveError(errorText(error, t('venuePricing.saveFailed')));
      logger.warn('VenuePricingModule', 'save', { error, venue_id: venue.id });
    }
  };

  const saveHolidays = async (next: string[]) => {
    await pricingModule.saveHolidays(next);
    await onVenueChanged?.();
  };

  return (
    <Stack spacing={2.5} data-testid="venue-pricing-module">
      {!pricing.configured && (
        <Alert severity="warning" data-testid="venue-pricing-not-configured">
          {t('venuePricing.notConfigured')}
        </Alert>
      )}
      <VenuePricingForm
        defaultValues={defaults}
        onSubmit={submit}
        saving={pricingModule.saving}
        errorMessage={saveError}
        renderPreview={(values, valid) => <PricingPreview venueId={venue.id} values={values} valid={valid} />}
      />
      <PricingCalendar
        venueId={venue.id}
        pricing={pricing}
        holidays={holidays}
        savePricing={pricingModule.save}
        saveHolidays={saveHolidays}
      />
    </Stack>
  );
}
