import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack } from '@mui/material';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { splitPodRequests, type PodRequestSide } from '@duncit/utils';
import HostSectionHeader from '../host-manage-page/HostSectionHeader';
import { useTranslation } from '../../i18n/useTranslation';
import PodRequestList from './components/PodRequestList';
import RespondButtons from './components/RespondButtons';
import { MY_POD_PARTNER_REQUESTS } from './queries';
import { usePodRequestActions } from './usePodRequestActions';

type RequestsTab = 'REQUESTS' | 'ACCEPTED';

/** Studio pages carry other strips, so this one keeps its own query param. */
const TAB_PARAM = 'selectedtab_podrequests';

const SEGMENTED_SX = {
  p: 0.5,
  borderRadius: 999,
  bgcolor: 'background.paper',
  border: '1px solid var(--duncit-card-border)',
  '& .MuiTab-root': { minHeight: 40, borderRadius: 999, fontWeight: 600, color: 'text.primary', flex: 1 },
  '& .MuiTab-root.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText' },
} as const;

interface Props {
  side: PodRequestSide;
  /** Venue Studio narrows to the venue its switcher has selected. */
  venueId?: string;
}

/**
 * Host Studio's "Pod Requests from Venues" and Venue Studio's "Pod Requests
 * from Hosts": what the other side sent (Requests, answered inline), what this
 * side accepted (through to the pod), what this side sent, and the door to
 * the nearby search. One component, the side decides the words.
 */
export default function PodRequestsSection({ side, venueId }: Readonly<Props>) {
  const { t } = useTranslation();
  const isHost = side === 'HOST';
  const actions = usePodRequestActions();
  const query = useQuery(MY_POD_PARTNER_REQUESTS, {
    variables: { side, venue_id: venueId ?? null },
    fetchPolicy: 'cache-and-network',
  });
  const items: DuncitTabItem<RequestsTab>[] = [
    { value: 'REQUESTS', label: t('podRequests.tabRequests'), testId: 'pod-requests-tab-requests' },
    {
      value: 'ACCEPTED',
      label: isHost ? t('podRequests.tabVenueAccepted') : t('podRequests.tabHostAccepted'),
      testId: 'pod-requests-tab-accepted',
    },
  ];
  const tabs = useTabParam<RequestsTab>({ items, fallback: 'REQUESTS', param: TAB_PARAM });
  const { incoming, accepted, sent } = splitPodRequests(query.data?.myPodPartnerRequests ?? []);
  const loading = query.loading && !query.data;

  const answer = async (id: string, accept: boolean) => {
    if ((await actions.respond(id, accept)) && accept) tabs.onChange('ACCEPTED');
  };

  return (
    <Stack spacing={1.5} data-testid={`pod-requests-section-${side.toLowerCase()}`}>
      <HostSectionHeader
        title={isHost ? t('podRequests.fromVenuesTitle') : t('podRequests.fromHostsTitle')}
        testId="pod-requests-title"
      />
      <DuncitButton
        component={RouterLink}
        to={isHost ? '/host/nearby-venues' : '/venues/nearby-hosts'}
        variant="outlined"
        startIcon={<TravelExploreRoundedIcon />}
        data-testid="pod-requests-search"
      >
        {isHost ? t('podRequests.searchVenuesTitle') : t('podRequests.searchHostsTitle')}
      </DuncitButton>
      <DuncitTabs
        {...tabs}
        variant="fullWidth"
        textColor="primary"
        slotProps={{ indicator: { sx: { display: 'none' } } }}
        sx={SEGMENTED_SX}
      />
      {query.error && <Alert severity="error">{query.error.message}</Alert>}
      {actions.error && (
        <Alert severity="error" onClose={actions.clearError} data-testid="pod-requests-action-error">
          {actions.error}
        </Alert>
      )}
      {loading && <Skeleton variant="rounded" height={96} />}
      {!loading && tabs.value === 'REQUESTS' && (
        <PodRequestList
          requests={incoming}
          emptyText={t('podRequests.emptyIncoming')}
          testId="pod-requests-incoming"
          renderActions={(request) => (
            <RespondButtons
              acceptLabel={t('podRequests.accept')}
              declineLabel={t('podRequests.decline')}
              busy={actions.busy}
              onAnswer={(accept) => {
                answer(request.id, accept).catch(() => undefined);
              }}
              testId={`pod-request-respond-${request.id}`}
            />
          )}
        />
      )}
      {!loading && tabs.value === 'ACCEPTED' && (
        <PodRequestList requests={accepted} emptyText={t('podRequests.emptyAccepted')} testId="pod-requests-accepted" />
      )}
      <HostSectionHeader
        title={isHost ? t('podRequests.sentToVenuesTitle') : t('podRequests.sentToHostsTitle')}
        count={sent.length}
        testId="pod-requests-sent-title"
      />
      {!loading && <PodRequestList requests={sent} emptyText={t('podRequests.emptySent')} testId="pod-requests-sent" />}
    </Stack>
  );
}
