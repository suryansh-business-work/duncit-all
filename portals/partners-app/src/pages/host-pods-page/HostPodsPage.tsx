import { useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { HostPodActionsMenu, useHostPodActions } from '@duncit/host-pod-actions';
import { useRequestPodChange } from '@duncit/pod-change-requests';
import { changeRequestMenuKey } from '@duncit/utils';
import { buildPodInput, type PodFormValues } from '@duncit/pod-form';
import PodsTable from '../../components/PodsTable';
import HostPodActionsBridge from '../../components/HostPodActionsBridge';
import NewPodDialog from './NewPodDialog';
import {
  CREATE_PARTNER_POD,
  MY_HOST_PODS_TABLE,
  PARTNER_POD_LOOKUPS,
  type PartnerPodRow,
} from '../pods-page/queries';
import { PARTNER_POD_CONFIG } from '../pods-page/partner-pod-config';
import { useTranslation } from '@duncit/shell';

/**
 * A cancelled pod has nothing left to act on.
 *
 * A COMPLETED one still does — the rating link is shared after the pod, which
 * is exactly when guests fill it in — so only cancellation closes the menu.
 */
const isCancelled = (pod: PartnerPodRow) => !!pod.is_deleted;

/**
 * Host > Your Pods — every pod this host runs, as a table, with the same
 * per-pod actions the native app offers in its PodActionsSheet (rule 27):
 * scan tickets, complete, edit (or resubmit a venue-rejected pod), share the
 * rating link, and cancel.
 */
function HostPodsContent() {
  const { t } = useTranslation();
  const { data, error } = useQuery<any>(PARTNER_POD_LOOKUPS, { fetchPolicy: 'cache-and-network' });
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [createPod, createState] = useMutation<any>(CREATE_PARTNER_POD);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const clubs = data?.clubs ?? [];
  const venues = (data?.myVenues ?? []).filter(
    (venue: any) => venue.status === 'APPROVED' && venue.is_active,
  );
  const products = data?.availablePodProducts ?? [];
  const approvedHost = data?.myHost?.status === 'APPROVED';
  const clubName = (id: string) =>
    clubs.find((club: any) => club.id === id)?.club_name ?? 'Club';
  const venueName = (id?: string | null) =>
    venues.find((venue: any) => venue.id === id)?.venue_name ?? 'Venue';

  const fetchRows = useApolloTableFetch<PartnerPodRow>(client, MY_HOST_PODS_TABLE, 'myHostPodsTable');
  const { menuHandlers, dialogs } = useHostPodActions(() => refetchRef.current?.());
  // "Request Change Host" — one instance for the whole table, its dialog
  // rendered once beside the host dialogs below.
  const change = useRequestPodChange({ onFiled: setMessage });

  const submit = async (values: PodFormValues, options: { draft: boolean }) => {
    await createPod({
      variables: { input: buildPodInput(values, { draft: options.draft, config: PARTNER_POD_CONFIG }) },
    });
    setOpen(false);
    setMessage(options.draft ? 'Pod draft saved.' : 'Pod created.');
    refetchRef.current?.();
  };

  const renderActions = (pod: PartnerPodRow) => (
    <HostPodActionsMenu
      {...menuHandlers(pod)}
      disabled={isCancelled(pod)}
      onRequestChange={() =>
        change.open({
          podDocId: pod.id,
          role: 'HOST',
          attendeeCount: pod.pod_attendees?.length ?? 0,
        })
      }
      requestChangeLabel={t(changeRequestMenuKey('HOST'))}
    />
  );

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          p: 2.25,
          borderRadius: 2,
          color: '#fff',
          background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: { xs: 'flex-start', sm: 'center' }
          }}>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 900 }}>
              Partner tools · Host
            </Typography>
            <Typography variant="h4" sx={{
              fontWeight: 950
            }}>
              Your Pods
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 0.75 }}>
              Manage the pods you host — check guests in, complete them and settle your share.
            </Typography>
          </Box>
          <DuncitButton
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!approvedHost}
            onClick={() => setOpen(true)}
            sx={{ bgcolor: '#fff', color: '#15111c', '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}
          >
            {t('partners.common.newPod')}
          </DuncitButton>
        </Stack>
      </Box>

      {!approvedHost && (
        <Alert severity="info">
          {t('partners.podsPage.yourHostApplicationMustBeApproved')}
        </Alert>
      )}
      {error && <Alert severity="error">{error.message}</Alert>}

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <PodsTable<PartnerPodRow>
            tableId="partners-app-host-pods"
            fetchRows={fetchRows}
            refetchRef={refetchRef}
            clubName={clubName}
            venueName={venueName}
            emptyText={t('partners.common.noPodsCreatedFromYourPartner')}
            renderActions={renderActions}
          />
        </CardContent>
      </Card>

      <NewPodDialog
        open={open}
        clubs={clubs}
        venues={venues}
        products={products}
        busy={createState.loading}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      />
      {dialogs}
      {change.dialog}
      <Snackbar
        open={!!message}
        autoHideDuration={2500}
        message={message ?? ''}
        onClose={() => setMessage(null)}
      />
    </Stack>
  );
}

export default function HostPodsPage() {
  return (
    <HostPodActionsBridge>
      <HostPodsContent />
    </HostPodActionsBridge>
  );
}
