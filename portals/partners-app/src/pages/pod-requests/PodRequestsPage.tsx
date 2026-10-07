import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TravelExploreRoundedIcon from '@mui/icons-material/TravelExploreRounded';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import { parseApiError, splitPodRequests } from '@duncit/utils';
import PodRequestList from './PodRequestList';
import { MY_POD_REQUESTS, type PodRequestRow, type PodRequestSide } from './queries';
import { nearbySearchPath } from './side';
import { usePodRequestActions } from './usePodRequestActions';

type Tab = 'requests' | 'accepted';
const TAB_PARAM = 'selectedtab_podrequests';
const TAB_PREFIX = 'pod-requests';

/** Each studio's own words — written out per side so every key stays literal. */
function useSideCopy(side: PodRequestSide) {
  const { t } = useTranslation();
  return side === 'VENUE'
    ? {
        title: t('podRequests.fromHostsTitle'),
        accepted: t('podRequests.tabHostAccepted'),
        sent: t('podRequests.sentToHostsTitle'),
        search: t('podRequests.searchHostsTitle'),
      }
    : {
        title: t('podRequests.fromVenuesTitle'),
        accepted: t('podRequests.tabVenueAccepted'),
        sent: t('podRequests.sentToVenuesTitle'),
        search: t('podRequests.searchVenuesTitle'),
      };
}

/**
 * Venue Owner / Host → Pod Requests: what the other side asked for (Requests,
 * then the Accepted tab through to the pod), and what this side sent.
 */
export default function PodRequestsPage({ side }: Readonly<{ side: PodRequestSide }>) {
  const { t } = useTranslation();
  const copy = useSideCopy(side);
  const actions = usePodRequestActions();
  const list = useQuery<{ myPodPartnerRequests: PodRequestRow[] }>(MY_POD_REQUESTS, {
    variables: { side },
    fetchPolicy: 'cache-and-network',
  });
  const { incoming, accepted, sent } = useMemo(
    () => splitPodRequests(list.data?.myPodPartnerRequests ?? []),
    [list.data],
  );
  const items = useMemo(
    () => [
      { value: 'requests' as const, label: t('podRequests.tabRequests') },
      { value: 'accepted' as const, label: copy.accepted },
    ],
    [t, copy.accepted],
  );
  const tabs = useTabParam<Tab>({ items, fallback: 'requests', param: TAB_PARAM });

  if (list.loading && !list.data) return <Skeleton variant="rounded" height={260} />;

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid={`pod-requests-${side.toLowerCase()}`}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800, flex: 1 }}>
          {copy.title}
        </Typography>
        <DuncitButton
          component={RouterLink}
          to={nearbySearchPath(side)}
          variant="contained"
          startIcon={<TravelExploreRoundedIcon />}
        >
          {copy.search}
        </DuncitButton>
      </Stack>
      {list.error && <Alert severity="error">{parseApiError(list.error)}</Alert>}
      {actions.notice && (
        <Alert severity={actions.notice.severity} onClose={actions.clearNotice}>
          {actions.notice.text}
        </Alert>
      )}
      <DuncitTabs {...tabs} idPrefix={TAB_PREFIX} aria-label={copy.title} searchable={false} />
      <Box {...tabPanelProps(TAB_PREFIX, tabs.value)}>
        {tabs.value === 'requests' ? (
          <PodRequestList
            requests={incoming}
            emptyText={t('podRequests.emptyIncoming')}
            busy={actions.busy}
            onRespond={(id, accept) => {
              actions.respond(id, accept).catch(() => undefined);
            }}
          />
        ) : (
          <PodRequestList requests={accepted} emptyText={t('podRequests.emptyAccepted')} />
        )}
      </Box>
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
        {copy.sent}
      </Typography>
      <PodRequestList requests={sent} emptyText={t('podRequests.emptySent')} />
    </Stack>
  );
}
