import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlaceIcon from '@mui/icons-material/Place';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import {
  HostPodActionsMenu,
  VENUE_REJECTED_NOTE,
  isVenueRejected,
  venueApprovalChip,
} from '@duncit/host-pod-actions';
import type { HostPodRowActions } from '../hostPodRowActions';
import { formatDateTime } from '../../../utils/dateFormat';
import { useTranslation } from '../../../i18n/useTranslation';

/** One labelled fact on the card — the venue, and the two dates. */
function RequestFact({
  icon,
  label,
  value,
}: Readonly<{ icon: ReactNode; label: string; value: string }>) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Box sx={{ color: 'text.disabled', display: 'flex' }}>{icon}</Box>
      <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
        {label}: <strong>{value}</strong>
      </Typography>
    </Stack>
  );
}

interface Props extends HostPodRowActions {
  pod: any;
}

/**
 * A pod whose venue has not answered yet — or has refused. It carries the
 * request's own facts (which venue, when it was asked for, which event date)
 * that Your Pods has no room for, and keeps the same overflow menu so the host
 * can still edit, resubmit or cancel from here.
 */
export default function VenueRequestRow({
  pod,
  actions,
  onClubAdmin,
  onSeeAttendance,
  onSlotRequest,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const approvalChip = venueApprovalChip(pod.venue_approval_status);
  const rejected = isVenueRejected(pod.venue_approval_status);
  const free = pod.pod_type === 'FREE';
  const podPath = pod.club_slug && pod.pod_id ? `/club/${pod.club_slug}/pod/${pod.pod_id}` : '#';
  const venueName = pod.place_label || pod.zone_name || '—';

  return (
    <Stack
      spacing={0.75}
      sx={{
        p: 1.25,
        borderRadius: '16px',
        border: 1,
        borderColor: rejected ? 'error.light' : 'warning.light',
        bgcolor: 'background.paper',
        transition: 'all 160ms ease',
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Box
          component={RouterLink}
          to={podPath}
          sx={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
        >
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {pod.pod_title}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={free ? t('mweb.podType.free') : t('mweb.podType.paid')}
          color={free ? 'success' : 'primary'}
          variant="outlined"
        />
        <HostPodActionsMenu
          {...actions}
          onClubAdmin={onClubAdmin}
          onSeeAttendance={onSeeAttendance}
          onSlotRequest={onSlotRequest}
        />
      </Stack>

      <RequestFact
        icon={<PlaceIcon sx={{ fontSize: 15 }} />}
        label={t('mweb.common.venue')}
        value={venueName}
      />
      <RequestFact
        icon={<ScheduleSendIcon sx={{ fontSize: 15 }} />}
        label={t('mweb.hostManage.requestedOn')}
        value={formatDateTime(pod.created_at) || '—'}
      />
      <RequestFact
        icon={<EventAvailableIcon sx={{ fontSize: 15 }} />}
        label={t('mweb.hostManage.eventDate')}
        value={formatDateTime(pod.pod_date_time) || '—'}
      />

      {approvalChip && (
        <Box>
          <Chip size="small" label={approvalChip.label} color={approvalChip.color} />
        </Box>
      )}

      {rejected && (
        <Alert severity="warning" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ py: 0.25 }}>
          {VENUE_REJECTED_NOTE}
        </Alert>
      )}
    </Stack>
  );
}
