import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, CircularProgress, Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import RentalSettingsForm, { type RentalSettingsOutput, type RentalSettingsValues } from './rental-settings-form';
import {
  RENTAL_SETTINGS,
  UPDATE_RENTAL_SETTINGS,
  type RentalSettingsData,
  type UpdateRentalSettingsData,
  type UpdateRentalSettingsVars,
} from './queries';

/**
 * Finance > Rented Items > Settings: the rules every venue rental runs under —
 * the terms guests agree to, Duncit's commission on rent, and what is refunded
 * when. A change applies to the NEXT outcome; a rental already closed keeps the
 * commission it was closed with.
 */
export default function RentedItemsSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<RentalSettingsData>(RENTAL_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save, { loading: saving }] = useMutation<UpdateRentalSettingsData, UpdateRentalSettingsVars>(
    UPDATE_RENTAL_SETTINGS,
    { refetchQueries: [{ query: RENTAL_SETTINGS }] }
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const stored = data?.rentalSettings;
  const values = useMemo<RentalSettingsValues | null>(
    () =>
      stored
        ? {
            enabled: stored.enabled,
            terms_html: stored.terms_html,
            commission_pct: stored.commission_pct,
            rent_refundable_on_backout: stored.rent_refundable_on_backout,
            deposit_refundable: stored.deposit_refundable,
            booking_cutoff_hours: stored.booking_cutoff_hours,
            deposit_auto_release_days: stored.deposit_auto_release_days,
          }
        : null,
    [stored]
  );

  const submit = async (input: RentalSettingsOutput) => {
    setSaveError(null);
    try {
      await save({ variables: { input } });
      notifySuccess(t('finance.rentedItems.saved'));
    } catch (e) {
      setSaveError(parseApiError(e));
    }
  };

  return (
    <Box>
      <PageHeader title={t('finance.rentedItems.settingsTitle')} subtitle={t('finance.rentedItems.settingsSubtitle')} sx={{ mb: 3 }} />
      <Stack spacing={2}>
        <Alert severity="info">{t('finance.rentedItems.howItApplies')}</Alert>
        {loading && !values && (
          <Box sx={{ p: 6, textAlign: 'center' }} role="status" aria-label={t('finance.rentedItems.loading')}>
            <CircularProgress />
          </Box>
        )}
        {error && !values && (
          <Alert
            severity="error"
            data-testid="rental-settings-load-error"
            action={
              <DuncitButton
                color="inherit"
                size="small"
                // A failed retry is not lost: the query's own `error` keeps this alert up with the new reason.
                onClick={() => {
                  refetch().catch(() => undefined);
                }}
              >
                {t('shell.common.retry')}
              </DuncitButton>
            }
          >
            {parseApiError(error)}
          </Alert>
        )}
        {values && (
          <Card variant="outlined">
            <CardContent>
              <RentalSettingsForm values={values} busy={saving} errorMessage={saveError} onSubmit={submit} />
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
