import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useHostPodActions } from '@duncit/host-pod-actions';
import HostPodRow from './HostPodRow';
import HostPodsFilterSheet from './HostPodsFilterSheet';
import PodClubAdminDialog, { type PodClubAdminTarget } from './PodClubAdminDialog';
import {
  DEFAULT_HOST_PODS_FILTERS,
  activeHostFilterCount,
  filterHostPods,
  type HostPodsFilters,
} from './hostPodsFilters';
import { useTranslation } from '../../i18n/useTranslation';

interface HostPodsCardProps {
  pods: any[];
  loading: boolean;
  errorMessage?: string;
  onChanged: () => void;
}

/** "Your pods" — every pod this host runs, with a Type/Time/Price filter and the
 * host's self-service Complete/Edit/Cancel actions (2). */
export default function HostPodsCard({
  pods,
  loading,
  errorMessage,
  onChanged,
}: Readonly<HostPodsCardProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { menuHandlers, dialogs } = useHostPodActions(onChanged);
  const [filters, setFilters] = useState<HostPodsFilters>(DEFAULT_HOST_PODS_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [clubAdminPod, setClubAdminPod] = useState<PodClubAdminTarget | null>(null);

  const visible = filterHostPods(pods, filters);
  const activeCount = activeHostFilterCount(filters);

  let body;
  if (loading) {
    body = (
      <Stack
        sx={{
          alignItems: "center",
          py: 4
        }}>
        <CircularProgress size={22} />
      </Stack>
    );
  } else if (errorMessage) {
    body = <Alert severity="error">{errorMessage}</Alert>;
  } else if (pods.length === 0) {
    body = (
      <Alert severity="info">
        You don't host any pods yet. New pods you host will show up here.
      </Alert>
    );
  } else if (visible.length === 0) {
    body = (
      <Alert severity="info">{t('mweb.hostManage.noPodsMatchTheseFiltersTry')}</Alert>
    );
  } else {
    body = (
      <Stack spacing={1}>
        {visible.map((p: any) => (
          <HostPodRow
            key={p.id}
            pod={p}
            actions={menuHandlers(p)}
            onClubAdmin={() => setClubAdminPod(p)}
            onSeeAttendance={() => navigate(`/host/pod/${p.id}/attendance`)}
            onSlotRequest={() => navigate(`/host/pod-pending/${p.id}`)}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1
          }}>
          <EventIcon color="primary" />
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 700 }}>
            Your pods
          </Typography>
          <Tooltip title={t('mweb.hostManage.filterPods')}>
            <IconButton size="small" aria-label={t('mweb.hostManage.filterPods')} onClick={() => setFilterOpen(true)}>
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
      <PodClubAdminDialog pod={clubAdminPod} onClose={() => setClubAdminPod(null)} />
      {dialogs}
    </Card>
  );
}
