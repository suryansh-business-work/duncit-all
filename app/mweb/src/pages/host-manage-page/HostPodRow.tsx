import { Link as RouterLink } from 'react-router-dom';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TaskAltIcon from '@mui/icons-material/TaskAlt';

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

/** One hosted pod row — link to the pod + the host's Complete/Edit/Delete actions. */
export default function HostPodRow({ pod, onComplete, onEdit, onDelete }: Readonly<Props>) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{
        p: 1.25,
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'all 160ms ease',
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
      }}
    >
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
  );
}
