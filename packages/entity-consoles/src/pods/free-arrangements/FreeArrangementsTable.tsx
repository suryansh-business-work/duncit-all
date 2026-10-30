import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Chip, Link, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { fmtWhen } from '../monitoring/queries';
import type { FreeArrangementRow } from './queries';
import {
  VENUE_ANSWER_TONE,
  acceptedText,
  detailsText,
  freeReasonOptions,
  kindLabel,
  reasonText,
  statusKey,
  statusTone,
  venueAnswerLabel,
  venueAnswerOptions,
} from './values';

const getRowId = (row: FreeArrangementRow) => row.id;

/** The pod's title, linked to its page in this console, over its slug. */
const renderPod = (row: FreeArrangementRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Link component={RouterLink} to={`/pods/${row.id}`} variant="body2" sx={{ fontWeight: 600 }}>
      {row.pod_title || row.pod_slug}
    </Link>
    <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
      {row.pod_slug}
    </Typography>
  </Box>
);

const renderHost = (row: FreeArrangementRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="div">
      {row.host_name || '—'}
    </Typography>
    <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
      {row.host_email}
    </Typography>
  </Box>
);

/** A column the server cannot order or match on: its value is joined or derived per row. */
const DERIVED = { sortable: false, filterable: false } as const;

interface Props {
  fetchRows: TableFetch<FreeArrangementRow>;
}

/**
 * Every free pod and free venue request, read-only: what is free, why the host
 * says it is, when they accepted the free policy, who and where, and how the
 * venue answered. Search covers the title and both justifications' details.
 */
export default function FreeArrangementsTable({ fetchRows }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<FreeArrangementRow>[]>(() => {
    const renderKind = (row: FreeArrangementRow) => <Chip size="small" label={kindLabel(row, t)} />;
    const renderVenueAnswer = (row: FreeArrangementRow) => (
      <Chip size="small" variant="outlined" label={venueAnswerLabel(row, t)} color={VENUE_ANSWER_TONE[row.venue_approval_status]} />
    );
    const renderStatus = (row: FreeArrangementRow) => (
      <Chip size="small" label={t(statusKey(row))} color={statusTone(row)} />
    );
    return [
      { field: 'pod_title', headerName: t('admin.freeArrangements.colPod'), type: 'text', flex: 1, minWidth: 200, cellRenderer: renderPod, valueGetter: (row) => row.pod_title },
      { field: 'kind', headerName: t('admin.freeArrangements.colKind'), type: 'text', ...DERIVED, width: 160, cellRenderer: renderKind, valueGetter: (row) => kindLabel(row, t) },
      // Filters on either justification's reason (the server matches both).
      { field: 'reason', headerName: t('admin.freeArrangements.colReason'), type: 'enum', options: freeReasonOptions(t), sortable: false, minWidth: 170, valueGetter: (row) => reasonText(row, t) },
      { field: 'details', headerName: t('admin.freeArrangements.colDetails'), type: 'text', ...DERIVED, flex: 1, minWidth: 200, valueGetter: detailsText },
      { field: 'accepted_at', headerName: t('admin.freeArrangements.colAcceptedAt'), type: 'date', ...DERIVED, width: 180, valueGetter: acceptedText },
      { field: 'host_name', headerName: t('admin.freeArrangements.colHost'), type: 'text', ...DERIVED, minWidth: 200, cellRenderer: renderHost, valueGetter: (row) => `${row.host_name} ${row.host_email}`.trim() },
      { field: 'club_name', headerName: t('admin.freeArrangements.colClub'), type: 'text', ...DERIVED, minWidth: 160, valueGetter: (row) => row.club_name || '—' },
      { field: 'venue_name', headerName: t('admin.freeArrangements.colVenue'), type: 'text', ...DERIVED, minWidth: 160, valueGetter: (row) => row.venue_name || '—' },
      { field: 'venue_approval_status', headerName: t('admin.freeArrangements.colVenueStatus'), type: 'enum', options: venueAnswerOptions(t), width: 160, cellRenderer: renderVenueAnswer, valueGetter: (row) => venueAnswerLabel(row, t) },
      { field: 'pod_date_time', headerName: t('admin.freeArrangements.colPodDate'), type: 'date', width: 170, valueGetter: (row) => fmtWhen(row.pod_date_time) },
      { field: 'is_active', headerName: t('shell.common.status'), type: 'boolean', sortable: false, width: 130, cellRenderer: renderStatus, valueGetter: (row) => t(statusKey(row)) },
      { field: 'created_at', headerName: t('shell.common.created'), type: 'date', width: 170, valueGetter: (row) => fmtWhen(row.created_at) },
    ];
  }, [t]);

  return (
    <DuncitTable<FreeArrangementRow>
      ariaLabel={t('admin.freeArrangements.title')}
      tableId="free-arrangements"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('admin.freeArrangements.empty')}
      searchPlaceholder={t('admin.freeArrangements.search')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
    />
  );
}
