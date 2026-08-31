import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import {
  CancellationPolicyForm,
  toPolicyInput,
  toPolicyValues,
  type CancellationPolicyValues,
} from './cancellation-policy';
import {
  MY_VENUES_SETTINGS,
  UPDATE_VENUE_CANCELLATION,
  type VenueCancellationPolicy,
  type VenueSettingsVenue,
} from './queries';

/**
 * Venue Owner → Settings. One venue at a time, because the policy is the
 * venue's own: an owner with a turf and a banquet hall charges differently for
 * each, so a single console-wide policy would be wrong for one of them.
 */
export default function VenueSettingsPage() {
  const { t } = useTranslation();
  const [venueId, setVenueId] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery<any>(MY_VENUES_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [saveSettings, saveState] = useMutation<any>(UPDATE_VENUE_CANCELLATION);

  const venues: VenueSettingsVenue[] = data?.myVenues ?? [];
  const selected = venues.find((venue) => venue.id === venueId) ?? null;

  // Land on the first venue rather than an empty form nobody can act on.
  useEffect(() => {
    if (!selected && venues.length > 0) setVenueId(venues[0].id);
  }, [selected, venues, setVenueId]);

  // The form resets whenever these change, so they key off the policy's
  // CONTENT rather than its identity: a background refresh hands back a fresh
  // object every time, and resetting on that would wipe what the owner typed.
  const policyJson = JSON.stringify(selected?.settings?.cancellation ?? null);
  const initialValues = useMemo<CancellationPolicyValues>(
    () => toPolicyValues(JSON.parse(policyJson) as VenueCancellationPolicy | null),
    [policyJson]
  );

  const submit = async (values: CancellationPolicyValues) => {
    if (!selected) return;
    setApiError(null);
    try {
      await saveSettings({
        variables: {
          venue_doc_id: selected.id,
          input: { cancellation: toPolicyInput(values) },
        },
      });
      setMessage(t('partners.venueSettingsPage.saved'));
      await refetch();
    } catch (saveError) {
      setApiError(parseApiError(saveError));
    }
  };

  if (loading && !data) {
    return (
      <Stack
        sx={{
          alignItems: "center",
          py: 6
        }}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.25} sx={{ width: '100%', pb: 4 }}>
      <Stack spacing={0.5}>
        <Typography variant="h5" sx={{
          fontWeight: 700
        }}>
          {t('partners.venueSettingsPage.title')}
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('partners.venueSettingsPage.subtitle')}
        </Typography>
      </Stack>

      {venues.length === 0 ? (
        <Alert severity="info">{t('partners.venueSettingsPage.noVenues')}</Alert>
      ) : (
        <>
          <TextField
            select
            fullWidth
            label={t('partners.venueSettingsPage.venue')}
            value={selected?.id ?? ''}
            onChange={(event) => setVenueId(event.target.value)}
          >
            {venues.map((venue) => (
              <MenuItem key={venue.id} value={venue.id}>
                {venue.venue_name}
              </MenuItem>
            ))}
          </TextField>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1" sx={{
                  fontWeight: 600
                }}>
                  {t('partners.venueSettingsPage.cancellationTitle')}
                </Typography>
                <CancellationPolicyForm
                  initialValues={initialValues}
                  saving={saveState.loading}
                  error={apiError}
                  t={t}
                  onSubmit={submit}
                />
              </Stack>
            </CardContent>
          </Card>
        </>
      )}

      <Snackbar
        open={!!message}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        message={message ?? ''}
      />
    </Stack>
  );
}
