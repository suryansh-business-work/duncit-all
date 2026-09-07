import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Drawer, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import {
  DuncitTable,
  dateColumn,
  useApolloTableFetch,
  type DuncitColumn,
} from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { formatMoney } from '@duncit/utils';
import { REGION_HOST_PODS, type RegionHostPod } from './queries';

interface Props {
  /** The host whose pods to show; null keeps the drawer closed. */
  host: { id: string; label: string } | null;
  currency: string;
  onClose: () => void;
}

const getRowId = (row: RegionHostPod) => row.id;
const ACTIVE_COLORS = { ON: 'success', OFF: 'default' } as const;

/**
 * One host's pods, opened by clicking their box on the canvas.
 *
 * A drawer rather than a sixth column of nodes: a busy host runs dozens of
 * pods, and dozens of boxes hanging off one node is a canvas nobody can read.
 * The pods are also the only level with columns worth sorting.
 *
 * The list is scoped server-side to this region's own clubs — a host runs pods
 * elsewhere too, and those are not this manager's to see.
 */
export default function HostPodsDrawer({ host, currency, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const hostId = host?.id ?? '';

  const fetchRows = useApolloTableFetch<RegionHostPod>(
    client,
    REGION_HOST_PODS,
    'regionHostPods',
    { extraVariables: { host_user_id: hostId } },
    [hostId],
  );

  const columns = useMemo<DuncitColumn<RegionHostPod>[]>(() => {
    const renderPod = (row: RegionHostPod) => (
      <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
        <Typography variant="body2" component="span" noWrap sx={{ fontWeight: 700 }}>
          {row.pod_title}
        </Typography>
        <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
          {row.pod_id}
        </Typography>
      </Stack>
    );
    const renderActive = (row: RegionHostPod) => (
      <StatusChip
        status={row.is_active ? 'ON' : 'OFF'}
        colorMap={ACTIVE_COLORS}
        label={row.is_active ? t('partners.regional.podLive') : t('partners.regional.podOff')}
      />
    );
    return [
      {
        field: 'pod_title',
        headerName: t('partners.regional.pod'),
        flex: 1,
        minWidth: 200,
        cellRenderer: renderPod,
        valueGetter: (row) => row.pod_title,
      },
      dateColumn<RegionHostPod>({
        field: 'pod_date_time',
        headerName: t('partners.regional.when'),
        hide: false,
        width: 130,
      }),
      {
        field: 'club_name',
        headerName: t('partners.regional.club'),
        minWidth: 150,
        sortable: false,
        valueGetter: (row) => row.club_name || '—',
      },
      {
        field: 'pod_amount',
        headerName: t('partners.regional.price'),
        width: 110,
        filter: { type: 'number' },
        valueGetter: (row) =>
          formatMoney(row.pod_amount, { symbol: currency, decimals: 2, grouping: false }),
      },
      {
        field: 'no_of_spots',
        headerName: t('partners.regional.spots'),
        width: 100,
        valueGetter: (row) => row.no_of_spots,
      },
      {
        field: 'is_active',
        headerName: t('shell.common.status'),
        width: 120,
        sortable: false,
        cellRenderer: renderActive,
        valueGetter: (row) => (row.is_active ? 1 : 0),
      },
    ];
  }, [t, currency]);

  return (
    <Drawer
      anchor="right"
      open={!!host}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 620, lg: 780 }, p: 2.5 } } }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {host?.label}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('partners.regional.hostPodsSubtitle')}
          </Typography>
        </Box>
        <DuncitIconButton aria-label={t('shell.common.close')} onClick={onClose}>
          <CloseIcon />
        </DuncitIconButton>
      </Stack>

      {host && (
        <DuncitTable<RegionHostPod>
          tableId="regional-host-pods"
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getRowId}
          emptyText={t('partners.regional.noPodsForHost')}
          defaultSort={{ field: 'pod_date_time', dir: 'desc' }}
          defaultPageSize={10}
          searchPlaceholder={t('partners.regional.searchPods')}
        />
      )}
    </Drawer>
  );
}
