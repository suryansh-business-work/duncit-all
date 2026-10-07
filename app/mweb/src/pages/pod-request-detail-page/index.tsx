import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import { POD_PARTNER_REQUEST } from '../pod-requests/queries';
import { usePodRequestActions } from '../pod-requests/usePodRequestActions';
import { useTranslation } from '../../i18n/useTranslation';
import ActionBlock from './ActionBlock';
import ContactBlock from './ContactBlock';
import CounterpartCard from './CounterpartCard';
import SlotSummary from './SlotSummary';

/**
 * One Pod Request, for either side — where its notifications land. Who it is
 * with, the note, the slot once one is picked, the next move from the shared
 * `podRequestNextAction`, and the contact only once the pod exists.
 */
export default function PodRequestDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const actions = usePodRequestActions();
  const query = useQuery(POD_PARTNER_REQUEST, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const request = query.data?.podPartnerRequest ?? null;
  // Back lands in the studio the request belongs to — a notification may be the way in.
  const studio = request?.viewer_side === 'VENUE' ? '/venues/manage' : '/host/manage';

  let body: ReactNode;
  if (query.loading && !request) {
    body = <Skeleton variant="rounded" height={320} />;
  } else if (request) {
    body = (
      <>
        <CounterpartCard request={request} />
        {request.slot && <SlotSummary slot={request.slot} />}
        {actions.error && (
          <Alert severity="error" onClose={actions.clearError} data-testid="pod-request-action-error">
            {actions.error}
          </Alert>
        )}
        <ActionBlock request={request} actions={actions} />
        <ContactBlock request={request} />
      </>
    );
  } else {
    body = <Alert severity="error">{query.error?.message ?? t('podRequests.notFound')}</Alert>;
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 720, mx: 'auto', width: '100%' }} data-testid="pod-request-detail-page">
      <PageHeader title={t('podRequests.detailTitle')} onBack={() => navigate(studio)} testId="pod-request-detail" />
      {body}
    </Stack>
  );
}
