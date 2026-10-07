import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Card, CardContent, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import { notifySuccess } from '../../components/notify';
import { PodRequestLimitForm } from '../../components/pod-request-limit-form';
import { useTranslation } from '../../i18n/useTranslation';
import { MY_VENUES_CANCELLATION, UPDATE_VENUE_HOST_REQUEST_LIMIT, type SettingsVenue } from './queries';

interface Props {
  venue: SettingsVenue;
}

/** Venue Settings → "Maximum Host Requests / Month", for the venue the switcher has selected. */
export default function HostRequestLimitCard({ venue }: Readonly<Props>) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [save, saveState] = useMutation(UPDATE_VENUE_HOST_REQUEST_LIMIT, {
    refetchQueries: [MY_VENUES_CANCELLATION],
    awaitRefetchQueries: true,
  });

  const submit = async (limit: number) => {
    setApiError(null);
    try {
      await save({ variables: { venue_doc_id: venue.id, input: { rules: { max_host_requests_per_month: limit } } } });
      notifySuccess(t('podRequests.limitSaved'));
    } catch (saveError) {
      setApiError(parseApiError(saveError));
    }
  };

  return (
    <Card data-testid="venue-host-request-limit">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <SectionHeader testId="venue-host-request-limit-header" title={t('podRequests.venueLimitLabel')} />
          <PodRequestLimitForm
            label={t('podRequests.venueLimitLabel')}
            initialLimit={venue.settings?.rules?.max_host_requests_per_month ?? 0}
            override={venue.host_requests_limit_override ?? null}
            saving={saveState.loading}
            error={apiError}
            onSubmit={submit}
            testId="venue-host-request-limit-form"
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
