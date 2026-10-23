import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import VenueTypeCapacitySection from '../register-venue-page/sections/VenueTypeCapacitySection';
import { OpeningHoursForm } from './opening-hours';
import VenueSetupEditor from './VenueSetupEditor';
import VenueSetupPage from './VenueSetupPage';

/** Venue Options > Type, Capacity & Hours: the venue type, its spaces, and when it opens. */
export default function TypeCapacityPage() {
  const { t } = useTranslation();
  return (
    <VenueSetupPage
      titleKey="mweb.studioOptions.typeCapacity"
      hintKey="mweb.studioOptions.typeCapacityHint"
      testId="venue-type-capacity-page"
    >
      {(venue, refetch) => (
        <Stack spacing={2.5}>
          <VenueSetupEditor key={venue.id} venueId={venue.id} section="type-capacity" testId="venue-type-capacity">
            {({ form, config, mode }) => (
              <>
                {mode === 'edit-approved' && <Alert severity="info">{t('partners.venueSetup.typeLocked')}</Alert>}
                <VenueTypeCapacitySection form={form} config={config} mode={mode} />
              </>
            )}
          </VenueSetupEditor>
          <OpeningHoursForm key={`hours-${venue.id}`} venueId={venue.id} settings={venue.settings} onSaved={refetch} />
        </Stack>
      )}
    </VenueSetupPage>
  );
}
