import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  HostPodActionsMenu,
  VENUE_REJECTED_NOTE,
  isVenueRejected,
  venueApprovalChip,
  type HostPodMenuHandlers,
} from '@duncit/host-pod-actions';
import { formatDateTime } from '../../utils/dateFormat';

function formatDate(value?: string | null) {
  return formatDateTime(value) || '—';
}

interface Props {
  pod: any;
  /** This row's wiring into the shared action dialogs. */
  actions: HostPodMenuHandlers;
  /** Opens the club-admin card — mWeb's own dialog, not one the package owns. */
  onClubAdmin: () => void;
  /** Opens the pod's attendance PAGE — a route, so mWeb owns the navigation. */
  onSeeAttendance: () => void;
}

/** One hosted pod row — link to the pod + the host's actions behind a single
 * overflow menu. A venue-rejected pod shows its status + the resubmission note. */
export default function HostPodRow({
  pod,
  actions,
  onClubAdmin,
  onSeeAttendance,
}: Readonly<Props>) {
  const approvalChip = venueApprovalChip(pod.venue_approval_status);
  const rejected = isVenueRejected(pod.venue_approval_status);
  const free = pod.pod_type === 'FREE';
  const podPath = pod.club_slug && pod.pod_id ? `/club/${pod.club_slug}/pod/${pod.pod_id}` : '#';
  return (
    <Stack
      spacing={0.75}
      sx={{
        p: 1.25,
        borderRadius: '16px',
        border: 1,
        borderColor: rejected ? 'error.light' : 'divider',
        bgcolor: 'background.paper',
        transition: 'all 160ms ease',
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Box
          component={RouterLink}
          to={podPath}
          sx={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
        >
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {pod.pod_title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {formatDate(pod.pod_date_time)}
            {pod.zone_name ? ` · ${pod.zone_name}` : ''}
          </Typography>
        </Box>
        {approvalChip && <Chip size="small" label={approvalChip.label} color={approvalChip.color} />}
        <Chip
          size="small"
          // TODO(i18n)
          label={free ? 'Free' : 'Paid'}
          color={free ? 'success' : 'primary'}
          variant="outlined"
        />
        <HostPodActionsMenu
          {...actions}
          onClubAdmin={onClubAdmin}
          onSeeAttendance={onSeeAttendance}
        />
      </Stack>
      {rejected && (
        <Alert severity="warning" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ py: 0.25 }}>
          {VENUE_REJECTED_NOTE}
        </Alert>
      )}
    </Stack>
  );
}
