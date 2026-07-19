import { useState } from 'react';
import {
  Alert,
  Badge,
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
import FilterListIcon from '@mui/icons-material/FilterList';
import HostPodRow from './HostPodRow';
import HostPodsFilterSheet from './HostPodsFilterSheet';
import {
  DEFAULT_HOST_PODS_FILTERS,
  activeHostFilterCount,
  filterHostPods,
  type HostPodsFilters,
} from './hostPodsFilters';
import { PodEditForm, type HostPodSummary } from './pod-edit';
import { PodDeleteForm } from './pod-delete';
import { PodCompleteForm, type HostPodForComplete } from './pod-complete';

interface HostPodsCardProps {
  pods: any[];
  loading: boolean;
  errorMessage?: string;
  onChanged: () => void;
}

/** "Your pods" — every pod this host runs, with a Type/Time/Price filter and the
 * host's self-service Complete/Edit/Delete actions (2). */
export default function HostPodsCard({
  pods,
  loading,
  errorMessage,
  onChanged,
}: Readonly<HostPodsCardProps>) {
  const [editPod, setEditPod] = useState<HostPodSummary | null>(null);
  const [deletePod, setDeletePod] = useState<{ id: string; title: string } | null>(null);
  const [completePod, setCompletePod] = useState<HostPodForComplete | null>(null);
  const [filters, setFilters] = useState<HostPodsFilters>(DEFAULT_HOST_PODS_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const visible = filterHostPods(pods, filters);
  const activeCount = activeHostFilterCount(filters);

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
  } else if (visible.length === 0) {
    body = <Alert severity="info">No pods match these filters. Try adjusting or resetting them.</Alert>;
  } else {
    body = (
      <Stack spacing={1}>
        {visible.map((p: any) => (
          <HostPodRow
            key={p.id}
            pod={p}
            onComplete={() => setCompletePod({ id: p.id, pod_title: p.pod_title, venue_id: p.venue_id })}
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
          <Tooltip title="Filter pods">
            <IconButton size="small" aria-label="Filter pods" onClick={() => setFilterOpen(true)}>
              <Badge badgeContent={activeCount} color="primary">
                <FilterListIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <Chip size="small" label={visible.length} />
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        {body}
      </CardContent>
      <HostPodsFilterSheet
        open={filterOpen}
        initial={filters}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
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
      <PodCompleteForm
        pod={completePod}
        onClose={() => setCompletePod(null)}
        onCompleted={() => {
          setCompletePod(null);
          onChanged();
        }}
      />
    </Card>
  );
}
