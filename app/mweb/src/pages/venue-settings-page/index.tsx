import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Card, CardContent, Stack } from '@mui/material';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import type { VenueCancellationPolicy } from '@duncit/forms/schemas';
import { parseApiError, pickVenue } from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import { notifySuccess } from '../../components/notify';
import VenuePageFrame from '../venue-manage-page/VenuePageFrame';
import {
  CancellationPolicyForm,
  toPolicyInput,
  toPolicyValues,
  type CancellationPolicyValues,
} from './cancellation-policy-form';
import { MY_VENUES_CANCELLATION, UPDATE_VENUE_CANCELLATION_POLICY, type SettingsVenue } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Venue Settings, for a venue owner on their phone: the cancellation policy of
 * ONE venue at a time, because an owner with a turf and a banquet hall charges
 * differently for each. The rules and the form's copy are the shared
 * `@duncit/forms/schemas` + `venueSettings.*` pair the Partners console and
 * the native app use (rules 27 + 40).
 */
export default function VenueSettingsPage() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery<{ myVenues: SettingsVenue[] }>(
    MY_VENUES_CANCELLATION,
    { fetchPolicy: 'cache-and-network' }
  );
  const [savePolicy, saveState] = useMutation<any>(UPDATE_VENUE_CANCELLATION_POLICY);
  const venues = data?.myVenues ?? [];
  const venue = pickVenue(venues, selectedId);

  // Keyed off the policy's CONTENT rather than its identity: a background
  // refresh hands back a fresh object every time, and resetting the form on
  // that would wipe what the owner was typing.
  const policyJson = JSON.stringify(venue?.settings?.cancellation ?? null);
  const initialValues = useMemo<CancellationPolicyValues>(
    () => toPolicyValues(JSON.parse(policyJson) as VenueCancellationPolicy | null),
    [policyJson]
  );

  const submit = async (values: CancellationPolicyValues) => {
    if (!venue) return;
    setApiError(null);
    try {
      await savePolicy({
        variables: { venue_doc_id: venue.id, input: { cancellation: toPolicyInput(values, t) } },
      });
      notifySuccess(t('venueSettings.saved'));
      await refetch();
    } catch (saveError) {
      setApiError(parseApiError(saveError));
    }
  };

  return (
    <VenuePageFrame
      icon={<SettingsRoundedIcon fontSize="small" />}
      title={t('mweb.venueSettingsPage.title')}
      venues={venues}
      venue={venue}
      onSelect={setSelectedId}
      loading={loading && !data}
      error={error}
      noVenuesMessage={t('mweb.venueSettingsPage.noVenues')}
    >
      <Card sx={{ overflow: 'visible' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack spacing={1.5}>
            <SectionHeader title={t('venueSettings.cancellationTitle')} />
            <CancellationPolicyForm
              initialValues={initialValues}
              saving={saveState.loading}
              error={apiError}
              onSubmit={submit}
            />
          </Stack>
        </CardContent>
      </Card>
    </VenuePageFrame>
  );
}
