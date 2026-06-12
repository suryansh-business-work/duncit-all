import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { PodEditForm, type HostPodSummary } from './pod-edit';
import { PodDeleteForm } from './pod-delete';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

interface HostPodsCardProps {
  pods: any[];
  loading: boolean;
  errorMessage?: string;
  onChanged: () => void;
}

/** One hosted pod row — link to the pod + the host's Edit/Delete actions. */
function HostPodRow({
  pod,
  onEdit,
  onDelete,
}: Readonly<{ pod: any; onEdit: () => void; onDelete: () => void }>) {
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

/** "Your pods" — every pod this host runs, with self-service Edit + Delete (2). */
export default function HostPodsCard({
  pods,
  loading,
  errorMessage,
  onChanged,
}: Readonly<HostPodsCardProps>) {
  const [editPod, setEditPod] = useState<HostPodSummary | null>(null);
  const [deletePod, setDeletePod] = useState<{ id: string; title: string } | null>(null);

  let body;
  if (loading) {
    body = (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  } else if (errorMessage) {
    body = <Alert severity="error">{errorMessage}</Alert>;
  } else if (pods.length === 0) {
    body = (
      <Alert severity="info">You don't host any pods yet. New pods you host will show up here.</Alert>
    );
  } else {
    body = (
      <Stack spacing={1}>
        {pods.map((p: any) => (
          <HostPodRow
            key={p.id}
            pod={p}
            onEdit={() => setEditPod(p)}
            onDelete={() => setDeletePod({ id: p.id, title: p.pod_title })}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 4 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <EventIcon color="primary" />
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 950 }}>
            Your pods
          </Typography>
          <Chip size="small" label={pods.length} />
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        {body}
      </CardContent>
      <PodEditForm
        pod={editPod}
        onClose={() => setEditPod(null)}
        onSaved={() => {
          setEditPod(null);
          onChanged();
        }}
      />
      <PodDeleteForm
        podId={deletePod?.id ?? null}
        podTitle={deletePod?.title ?? ''}
        onClose={() => setDeletePod(null)}
        onDeleted={() => {
          setDeletePod(null);
          onChanged();
        }}
      />
    </Card>
  );
}
