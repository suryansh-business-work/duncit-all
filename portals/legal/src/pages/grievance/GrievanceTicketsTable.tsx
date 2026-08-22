import { useMemo, type MutableRefObject } from 'react';
import { Chip, IconButton, Tooltip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DuncitTable, dateColumn, entityIdColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import {
  GRIEVANCE_STATUS_COLOR,
  GRIEVANCE_STATUS_LABEL,
  GRIEVANCE_STATUS_OPTIONS,
  type GrievanceTicket,
} from '../../graphql/grievance';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<GrievanceTicket>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Admin-configured date + time, so every screen reads the same clock. */
  formatDateTime: (value: Date) => string;
  onOpen: (ticket: GrievanceTicket) => void;
}

const getRowId = (g: GrievanceTicket) => g.id;

const renderSubject = (g: GrievanceTicket) => (
  <Typography variant="body2" fontWeight={700} component="span">
    {g.subject}
  </Typography>
);

const renderStatus = (g: GrievanceTicket) => (
  <Chip
    size="small"
    variant={g.status === 'RECEIVED' ? 'outlined' : 'filled'}
    color={GRIEVANCE_STATUS_COLOR[g.status]}
    label={GRIEVANCE_STATUS_LABEL[g.status]}
  />
);

/** Where the grievance came from, as the column reads it. Keys rather than
 *  sentences: the enum is what the server stores, this is what a person sees.
 *  EMAIL means Mail Automation filed it from a connected mailbox — it carries
 *  no phone, because the complainant wrote in rather than filling the form. */
const SOURCE_KEY: Record<GrievanceTicket['source'], string> = {
  APP: 'legal.grievance.sourceApp',
  WEBSITE: 'legal.grievance.sourceWebsite',
  PORTAL: 'legal.grievance.sourcePortal',
  EMAIL: 'legal.grievance.sourceEmail',
};

/**
 * The grievance queue.
 *
 * Ordered newest first, and the id leads — a complainant chasing a grievance
 * quotes GRV-000123, not their own name, so that is what the search box has to
 * find first.
 */
export default function GrievanceTicketsTable({
  fetchRows,
  refetchRef,
  formatDateTime,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<GrievanceTicket>[]>(() => {
    const renderActions = (g: GrievanceTicket) => (
      <Tooltip title={t('legal.grievance.open')}>
        <IconButton size="small" aria-label={t('legal.grievance.open')} onClick={() => onOpen(g)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );

    // Only server-allowlisted fields are sortable/filterable
    // (GRIEVANCE_TABLE_CONFIG): sort grievance_no/name/email/subject/status/
    // source/created_at/updated_at; filter the same, status + source as selects.
    return [
      entityIdColumn<GrievanceTicket>({ field: 'grievance_no', headerName: t('legal.grievance.colId') }),
      {
        field: 'subject',
        headerName: t('legal.grievance.colSubject'),
        flex: 1,
        minWidth: 220,
        filter: { type: 'text' },
        cellRenderer: renderSubject,
      },
      { field: 'name', headerName: t('shell.common.name'), minWidth: 160, filter: { type: 'text' } },
      { field: 'email', headerName: t('shell.common.email'), minWidth: 200, filter: { type: 'text' } },
      { field: 'phone', headerName: t('shell.common.phone'), minWidth: 140, sortable: false, filter: { type: 'text' } },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 130,
        filter: { type: 'select', options: GRIEVANCE_STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (g) => GRIEVANCE_STATUS_LABEL[g.status],
      },
      {
        field: 'source',
        headerName: t('legal.grievance.colSource'),
        width: 110,
        filter: {
          type: 'select',
          // Built from the same map the cell reads, so the filter and the
          // column can never name a source two different things.
          options: Object.entries(SOURCE_KEY).map(([value, key]) => ({ value, label: t(key) })),
        },
        valueGetter: (g) => t(SOURCE_KEY[g.source]),
      },
      dateColumn<GrievanceTicket>({
        field: 'created_at',
        headerName: t('legal.grievance.colReceived'),
        hide: false,
        minWidth: 180,
        formatDate: formatDateTime,
      }),
      { field: 'actions', headerName: t('shell.common.actions'), sortable: false, width: 90, cellRenderer: renderActions },
    ];
  }, [formatDateTime, onOpen]);

  return (
    <DuncitTable<GrievanceTicket>
      tableId="legal-grievance-tickets"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText={t('legal.grievance.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search grievance ID, name, email or subject"
      refetchRef={refetchRef}
    />
  );
}
