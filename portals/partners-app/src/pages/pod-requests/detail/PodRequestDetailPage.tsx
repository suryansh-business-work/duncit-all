import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { slotSpanLabel } from '@duncit/slots';
import { BackHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { POD_REQUEST_DETAIL, type PodRequestDetail, type PodRequestSide } from '../queries';
import { podRequestsPath } from '../side';
import { usePodRequestActions } from '../usePodRequestActions';
import ContactBlock from './ContactBlock';
import CounterpartCard from './CounterpartCard';
import PodRequestActionBlock from './PodRequestActionBlock';

/**
 * `/venues/pod-requests/:id` and `/host/pod-requests/:id` — one request: who it
 * is with, its slot, and the one thing this side can do next.
 */
export default function PodRequestDetailPage({ side }: Readonly<{ side: PodRequestSide }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { id = '' } = useParams<{ id: string }>();
  const actions = usePodRequestActions();
  const { data, loading, error, refetch } = useQuery<{ podPartnerRequest: PodRequestDetail }>(POD_REQUEST_DETAIL, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const request = data?.podPartnerRequest ?? null;
  const back = (
    <BackHeader backTo={podRequestsPath(side)} backAriaLabel={t('podRequests.backToList')} title={t('podRequests.detailTitle')} />
  );

  if (loading && !request) {
    return (
      <Stack sx={{ alignItems: 'center', py: 5 }} role="status">
        <CircularProgress size={24} aria-label={t('shell.a11y.loading')} />
      </Stack>
    );
  }
  if (!request) {
    return (
      <Stack spacing={2}>
        {back}
        <Alert
          severity={error ? 'error' : 'warning'}
          action={
            <DuncitButton color="inherit" size="small" onClick={() => refetch()}>
              {t('shell.common.retry')}
            </DuncitButton>
          }
        >
          {error ? parseApiError(error) : t('podRequests.notFound')}
        </Alert>
      </Stack>
    );
  }

  const slot = request.slot;
  return (
    <Stack spacing={2.25} sx={{ width: '100%' }} data-testid="pod-request-detail">
      {back}
      {actions.notice && (
        <Alert severity={actions.notice.severity} onClose={actions.clearNotice}>
          {actions.notice.text}
        </Alert>
      )}
      <CounterpartCard request={request} />
      <Card variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack spacing={2} divider={<Divider flexItem />}>
          {slot && (
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
                {t('podRequests.slotDetails')}
              </Typography>
              <Typography variant="body2">
                {slotSpanLabel(slot.start_at, slot.end_at, slot.whole_day, fmt, t('shell.slots.wholeDay'))}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {slot.space_label || t('shell.slots.wholeVenue')}
              </Typography>
            </Stack>
          )}
          <PodRequestActionBlock request={request} actions={actions} />
          <ContactBlock contact={request.contact} />
        </Stack>
      </Card>
    </Stack>
  );
}
