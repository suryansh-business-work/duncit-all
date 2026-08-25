import { useMemo, type MutableRefObject } from 'react';
import { Box, Chip, Link, Stack, Switch, Tooltip, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation, type Translator } from '@duncit/app-settings';
import type { PortalAppFeature, PortalAppRow } from './queries';

/** Only a console mounts the shared header, so only a console has these two
 * buttons to offer — a website or the member app has neither. */
const hasConsoleHeader = (row: PortalAppRow) => row.kind === 'PORTAL';

const getRowId = (row: PortalAppRow) => row.key;
const nameValue = (row: PortalAppRow) => row.name;
const linkValue = (row: PortalAppRow) => row.url ?? '';

interface Props {
  fetchRows: TableFetch<PortalAppRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  busyKey?: string | null;
  onToggle: (row: PortalAppRow, feature: PortalAppFeature, next: boolean) => void;
}

type ToggleFeature = Props['onToggle'];

interface FeatureCellProps {
  row: PortalAppRow;
  field: PortalAppFeature;
  headerName: string;
  busyKey?: string | null;
  naLabel: string;
  onLabel: string;
  offLabel: string;
  onToggle: ToggleFeature;
}

/** One switch cell. A row without a console header shows why instead. */
function FeatureCell({
  row,
  field,
  headerName,
  busyKey,
  naLabel,
  onLabel,
  offLabel,
  onToggle,
}: Readonly<FeatureCellProps>) {
  if (!hasConsoleHeader(row)) {
    return (
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {naLabel}
      </Typography>
    );
  }
  return (
    <Tooltip title={row[field] ? onLabel : offLabel}>
      <Switch
        checked={row[field]}
        disabled={busyKey === row.key}
        onChange={(e) => onToggle(row, field, e.target.checked)}
        slotProps={{
          input: { 'aria-label': `${headerName} — ${row.name}` }
        }}
      />
    </Tooltip>
  );
}

interface ColumnDeps {
  t: Translator['t'];
  busyKey?: string | null;
  onToggle: ToggleFeature;
}

function buildColumns({ t, busyKey, onToggle }: ColumnDeps): DuncitColumn<PortalAppRow>[] {
  const kindLabel: Record<PortalAppRow['kind'], string> = {
    PORTAL: t('admin.portalApp.typePortal'),
    WEBSITE: t('admin.portalApp.typeWebsite'),
    APP: t('admin.portalApp.typeApp'),
  };
  const onLabel = t('admin.portalApp.on');
  const offLabel = t('admin.portalApp.off');
  const naLabel = t('admin.portalApp.notApplicable');

  const renderName = (row: PortalAppRow) => (
    <Box sx={{ lineHeight: 1.2 }}>
      <Typography variant="body2" component="div" sx={{
        fontWeight: 700
      }}>
        {row.name}
      </Typography>
      <Stack direction="row" spacing={0.5} component="span" sx={{
        alignItems: "center"
      }}>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {row.key}
        </Typography>
        <Chip size="small" variant="outlined" label={kindLabel[row.kind]} />
      </Stack>
    </Box>
  );

  const renderLink = (row: PortalAppRow) =>
    row.url ? (
      <Link
        href={row.url}
        target="_blank"
        rel="noopener noreferrer"
        variant="body2"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
      >
        {row.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        <OpenInNewIcon sx={{ fontSize: 14 }} />
      </Link>
    ) : (
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        —
      </Typography>
    );

  /** One switch column. A row without a console header shows why instead. */
  const featureColumn = (
    field: PortalAppFeature,
    headerName: string
  ): DuncitColumn<PortalAppRow> => ({
    field,
    headerName,
    sortable: false,
    width: 190,
    cellRenderer: (row: PortalAppRow) => (
      <FeatureCell
        row={row}
        field={field}
        headerName={headerName}
        busyKey={busyKey}
        naLabel={naLabel}
        onLabel={onLabel}
        offLabel={offLabel}
        onToggle={onToggle}
      />
    ),
    valueGetter: (row: PortalAppRow) => {
      if (!hasConsoleHeader(row)) return naLabel;
      return row[field] ? onLabel : offLabel;
    },
  });

  return [
    {
      field: 'name',
      headerName: t('admin.portalApp.colPortal'),
      flex: 1,
      minWidth: 220,
      cellRenderer: renderName,
      valueGetter: nameValue,
    },
    {
      field: 'url',
      headerName: t('admin.portalApp.colLink'),
      sortable: false,
      flex: 1,
      minWidth: 200,
      cellRenderer: renderLink,
      valueGetter: linkValue,
    },
    featureColumn('chat_enabled', t('admin.portalApp.colChat')),
    featureColumn('apps_enabled', t('admin.portalApp.colApps')),
  ];
}

export default function PortalAppSettingsTable({
  fetchRows,
  refetchRef,
  busyKey,
  onToggle,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo(() => buildColumns({ t, busyKey, onToggle }), [busyKey, onToggle, t]);

  return (
    <DuncitTable<PortalAppRow>
      tableId="admin-portal-app-settings"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('admin.portalApp.empty')}
      searchPlaceholder={t('admin.portalApp.searchPlaceholder')}
      refetchRef={refetchRef}
    />
  );
}
