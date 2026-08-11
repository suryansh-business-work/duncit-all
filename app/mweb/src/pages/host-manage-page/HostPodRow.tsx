import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HostPodActionsMenu from './HostPodActionsMenu';
import { isVenueRejected, VENUE_REJECTED_NOTE, venueApprovalChip } from './venueApproval';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

interface Props {
  pod: any;
  onScan: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onOpenFeedback: () => void;
  onShareFeedback: () => void;
  onCopyFeedback: () => void;
  onCancel: () => void;
}

/** One hosted pod row — link to the pod + the host's actions behind a single
 * overflow menu. A venue-rejected pod shows its status + the resubmission note. */
export default function HostPodRow({
  pod,
  onScan,
  onComplete,
  onEdit,
  onOpenFeedback,
  onShareFeedback,
  onCopyFeedback,
  onCancel,
}: Readonly<Props>) {
  const approvalChip = venueApprovalChip(pod.venue_approval_status);
  const rejected = isVenueRejected(pod.venue_approval_status);
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
          to={pod.club_slug && pod.pod_id ? `/club/${pod.club_slug}/pod/${pod.pod_id}` : '#'}
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
        {approvalChip && (
          <Chip size="small" label={approvalChip.label} color={approvalChip.color} />
        )}
        <Chip
          size="small"
          // TODO(i18n)
          label={pod.pod_type === 'FREE' ? 'Free' : 'Paid'}
          color={pod.pod_type === 'FREE' ? 'success' : 'primary'}
          variant="outlined"
        />
        <HostPodActionsMenu
          podTitle={pod.pod_title}
          onScan={onScan}
          onComplete={onComplete}
          onEdit={onEdit}
          onOpenFeedback={onOpenFeedback}
          onShareFeedback={onShareFeedback}
          onCopyFeedback={onCopyFeedback}
          onCancel={onCancel}
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
