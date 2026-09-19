import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Typography } from '@mui/material';
import { DuncitTable, actionsColumn, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import type { GoogleAnalyticsSite } from '@duncit/gql-types';
import { SITE_LABEL_KEYS, TAG_STATUS_COLORS, TAG_STATUS_KEYS, tagStatus, type TagStatus } from './google-analytics-copy';

/** A website row, with where its tag stands worked out once so it can sort and filter. */
type TagRow = GoogleAnalyticsSite & { status: TagStatus };

const getRowId = (row: TagRow) => row.site;

const renderMeasurementId = (row: TagRow) => (
  <Typography variant="body2" sx={{ fontFamily: 'monospace', py: 0.5 }}>
    {row.measurement_id}
  </Typography>
);

const renderUpdated = (row: TagRow) =>
  row.updated_at && (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {formatDateTime(row.updated_at)}
    </Typography>
  );

interface Props {
  sites: readonly GoogleAnalyticsSite[];
  toolbarActions: ReactNode;
  onEdit: (row: GoogleAnalyticsSite) => void;
  onDelete: (row: GoogleAnalyticsSite) => void;
}

/** Every Duncit website and its tag — six rows, paged in the browser. */
export default function GoogleAnalyticsTable({ sites, toolbarActions, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const refetchRef = useRef<(() => void) | null>(null);
  const rows = useMemo<TagRow[]>(() => sites.map((row) => ({ ...row, status: tagStatus(row) })), [sites]);

  const columns = useMemo<DuncitColumn<TagRow>[]>(
    () => [
      {
        field: 'site',
        headerName: t('tech.googleAnalytics.colWebsite'),
        flex: 1.4,
        minWidth: 240,
        type: 'enum',
        options: sites.map((row) => ({ value: row.site, label: t(SITE_LABEL_KEYS[row.site]) })),
        cellRenderer: (row) => t(SITE_LABEL_KEYS[row.site]),
      },
      {
        field: 'measurement_id',
        headerName: t('tech.googleAnalytics.measurementId'),
        flex: 1,
        minWidth: 170,
        type: 'text',
        cellRenderer: renderMeasurementId,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 130,
        type: 'enum',
        options: (['LIVE', 'OFF', 'NOT_SET'] as const).map((status) => ({ value: status, label: t(TAG_STATUS_KEYS[status]) })),
        cellRenderer: (row) => (
          <StatusChip status={row.status} colorMap={TAG_STATUS_COLORS} label={t(TAG_STATUS_KEYS[row.status])} />
        ),
      },
      {
        field: 'updated_at',
        headerName: t('tech.googleAnalytics.colUpdated'),
        width: 190,
        type: 'date',
        cellRenderer: renderUpdated,
      },
      actionsColumn<TagRow>({
        width: 120,
        onEdit,
        onDelete,
        delete: {
          disabled: (row) => !row.measurement_id,
          disabledTitle: () => t('tech.googleAnalytics.noTagToRemove'),
        },
      }),
    ],
    [onDelete, onEdit, sites, t],
  );
  const searchOf = useMemo(
    () => (row: TagRow) => `${t(SITE_LABEL_KEYS[row.site])} ${row.measurement_id ?? ''}`,
    [t],
  );
  const fetchRows = useMemo(() => clientTableFetch(rows, searchOf, columns), [rows, searchOf, columns]);

  // The table fetches once per query change, not per new fetch function — so a
  // saved or removed tag has to ask it to read the new list.
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  return (
    <DuncitTable<TagRow>
      ariaLabel={t('shell.nav.googleAnalytics')}
      tableId="tech-google-analytics"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('tech.googleAnalytics.empty')}
      searchPlaceholder={t('tech.googleAnalytics.searchPlaceholder')}
      refetchRef={refetchRef}
    />
  );
}
