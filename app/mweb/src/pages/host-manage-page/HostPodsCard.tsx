import { useState } from 'react';
import { Alert, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import HostPodRow from './HostPodRow';
import HostPodsFilterSheet from './HostPodsFilterSheet';
import HostSectionHeader from './HostSectionHeader';
import RowGroup from './RowGroup';
import type { HostPodRowActions } from './hostPodRowActions';
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
  /** Per-row wiring into the action dialogs the sections container owns. */
  rowProps: (pod: any) => HostPodRowActions;
}

/** "Your pods" — every pod this host runs, with a Type/Time/Price filter and the
 * host's self-service Complete/Edit/Cancel actions (2). */
export default function HostPodsCard({
  pods,
  loading,
  errorMessage,
  rowProps,
}: Readonly<HostPodsCardProps>) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<HostPodsFilters>(DEFAULT_HOST_PODS_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const visible = filterHostPods(pods, filters);
  const activeCount = activeHostFilterCount(filters);
  const filterActive = activeCount > 0;
  const filterLabel = filterActive
    ? t('mweb.hostManage.filterCount', { count: activeCount })
    : t('mweb.common.filter');

  const emptyLine = (text: string) => (
    <Typography variant="body2" sx={{ px: 2, py: 2.5, textAlign: 'center', color: 'text.secondary' }}>
      {text}
    </Typography>
  );

  let body;
  if (loading) {
    body = (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  } else if (errorMessage) {
    body = <Alert severity="error" sx={{ m: 2 }}>{errorMessage}</Alert>;
  } else if (pods.length === 0) {
    body = emptyLine("You don't host any pods yet. New pods you host will show up here.");
  } else if (visible.length === 0) {
    body = emptyLine(t('mweb.hostManage.noPodsMatchTheseFiltersTry'));
  } else {
    body = visible.map((p: any) => <HostPodRow key={p.id} pod={p} {...rowProps(p)} />);
  }

  return (
    <Stack spacing={1.5}>
      <HostSectionHeader title={t('mweb.common.yourPods')} count={visible.length}>
        <Chip
          clickable
          icon={<FilterListRoundedIcon />}
          label={filterLabel}
          aria-label={t('mweb.hostManage.filterPods')}
          color={filterActive ? 'primary' : 'default'}
          variant={filterActive ? 'filled' : 'outlined'}
          onClick={() => setFilterOpen(true)}
          sx={{ height: 36, minHeight: 36 }}
        />
      </HostSectionHeader>
      <RowGroup>{body}</RowGroup>
      <HostPodsFilterSheet
        open={filterOpen}
        initial={filters}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </Stack>
  );
}
