import { Link as RouterLink } from 'react-router';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { coverImageUrl } from '@duncit/utils';
import {
  HostPodActionsMenu,
  VENUE_REJECTED_NOTE,
  isVenueRejected,
  venueApprovalChip,
} from '@duncit/host-pod-actions';
import PodThumb from './PodThumb';
import type { HostPodRowActions } from './hostPodRowActions';
import { formatDateTime } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';

function formatDate(value?: string | null) {
  return formatDateTime(value) || '—';
}

interface Props extends HostPodRowActions {
  pod: any;
}

/** One hosted pod row inside the Your-pods card — cover, title, when/where, the
 * Paid/Free pill and the host's actions behind a single overflow menu. A
 * venue-rejected pod shows its status + the resubmission note. */
export default function HostPodRow({
  pod,
  actions,
  onClubAdmin,
  onSeeAttendance,
  onSlotRequest,
  onRequestChange,
  requestChangeLabel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const approvalChip = venueApprovalChip(pod.venue_approval_status);
  const rejected = isVenueRejected(pod.venue_approval_status);
  const free = pod.pod_type === 'FREE';
  const podPath = pod.club_slug && pod.pod_id ? `/club/${pod.club_slug}/pod/${pod.pod_id}` : '#';
  return (
    <Stack spacing={1} sx={{ px: 2, py: 1.75 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Box
          component={RouterLink}
          to={podPath}
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <PodThumb src={coverImageUrl(pod.pod_images_and_videos)} />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>
              {pod.pod_title}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ color: 'text.secondary', display: 'block' }}
            >
              {formatDate(pod.pod_date_time)}
              {pod.zone_name ? ` · ${pod.zone_name}` : ''}
            </Typography>
            {approvalChip && (
              <Chip
                label={approvalChip.label}
                color={approvalChip.color}
                sx={{ mt: 0.5, height: 24 }}
              />
            )}
          </Box>
        </Box>
        <Chip
          label={free ? t('mweb.podType.free') : t('mweb.podType.paid')}
          color={free ? 'success' : 'primary'}
          variant="outlined"
          sx={{ height: 24 }}
        />
        <HostPodActionsMenu
          {...actions}
          onClubAdmin={onClubAdmin}
          onSeeAttendance={onSeeAttendance}
          onSlotRequest={onSlotRequest}
          onRequestChange={onRequestChange}
          requestChangeLabel={requestChangeLabel}
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
