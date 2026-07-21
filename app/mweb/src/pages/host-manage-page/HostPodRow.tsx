import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { isVenueRejected, VENUE_REJECTED_NOTE, venueApprovalChip } from './venueApproval';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

interface Props {
  pod: any;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** One hosted pod row — link to the pod + the host's Complete/Edit/Delete
 * actions. A venue-rejected pod shows its status + the resubmission note. */
export default function HostPodRow({ pod, onComplete, onEdit, onDelete }: Readonly<Props>) {
  const approvalChip = venueApprovalChip(pod.venue_approval_status);
  const rejected = isVenueRejected(pod.venue_approval_status);
  return (
    <Stack
      spacing={0.75}
      sx={{
        p: 1.25,
        borderRadius: 3,
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
          label={pod.pod_type?.replace(/_/g, ' ')}
          color={pod.pod_type?.includes('FREE') ? 'success' : 'primary'}
          variant="outlined"
        />
        <Tooltip title="Complete pod">
          <IconButton size="small" color="success" aria-label="Complete pod" onClick={onComplete}>
            <TaskAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit pod">
          <IconButton size="small" aria-label="Edit pod" onClick={onEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete pod">
          <IconButton size="small" color="error" aria-label="Delete pod" onClick={onDelete}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      {rejected && (
        <Alert severity="warning" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ py: 0.25 }}>
          {VENUE_REJECTED_NOTE}
        </Alert>
      )}
    </Stack>
  );
}
