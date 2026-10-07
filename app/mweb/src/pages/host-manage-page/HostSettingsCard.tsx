import { useState } from 'react';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, Skeleton, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { notifySuccess } from '../../components/notify';
import { PodRequestLimitForm } from '../../components/pod-request-limit-form';
import { useTranslation } from '../../i18n/useTranslation';
import HostSectionHeader from './HostSectionHeader';

interface HostLimitRow {
  id: string;
  max_venue_requests_per_month: number;
  venue_requests_limit_override: number | null;
}

const MY_HOST_REQUEST_LIMIT: TypedDocumentNode<{ myHost: HostLimitRow | null }> = gql`
  query MyHostVenueRequestLimit {
    myHost {
      id
      max_venue_requests_per_month
      venue_requests_limit_override
    }
  }
`;

const SET_MY_VENUE_REQUEST_LIMIT: TypedDocumentNode<{ setMyVenueRequestLimit: HostLimitRow }, { limit: number }> = gql`
  mutation SetMyVenueRequestLimit($limit: Int!) {
    setMyVenueRequestLimit(limit: $limit) {
      id
      max_venue_requests_per_month
      venue_requests_limit_override
    }
  }
`;

/** Host Studio → Host Settings: how many Pod Requests this host may send to venues each month. */
export default function HostSettingsCard() {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const query = useQuery(MY_HOST_REQUEST_LIMIT, { fetchPolicy: 'cache-and-network' });
  const [save, saveState] = useMutation(SET_MY_VENUE_REQUEST_LIMIT);
  const host = query.data?.myHost ?? null;

  const submit = async (limit: number) => {
    setApiError(null);
    try {
      await save({ variables: { limit } });
      notifySuccess(t('podRequests.limitSaved'));
    } catch (saveError) {
      setApiError(parseApiError(saveError));
    }
  };

  let body = <Skeleton variant="rounded" height={120} />;
  if (query.error) body = <Alert severity="error">{query.error.message}</Alert>;
  else if (host) {
    body = (
      <PodRequestLimitForm
        label={t('podRequests.hostLimitLabel')}
        initialLimit={host.max_venue_requests_per_month}
        override={host.venue_requests_limit_override}
        saving={saveState.loading}
        error={apiError}
        onSubmit={submit}
        testId="host-venue-request-limit-form"
      />
    );
  }
  // No host profile (yet): nothing to set.
  if (!query.loading && !query.error && !host) return null;

  return (
    <Stack spacing={1.5} data-testid="host-settings">
      <HostSectionHeader title={t('podRequests.hostSettingsTitle')} testId="host-settings-title" />
      <Card>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>{body}</CardContent>
      </Card>
    </Stack>
  );
}
