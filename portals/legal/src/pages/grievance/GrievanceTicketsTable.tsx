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

const SOURCE_LABEL: Record<GrievanceTicket['source'], string> = {
  APP: 'App',
  WEBSITE: 'Website',
  PORTAL: 'Portal',
  // Mail Automation filed it from a connected mailbox. It carries no phone —
  // the complainant wrote in rather than filling the form.
  EMAIL: 'Email',
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
  const columns = useMemo<DuncitColumn<GrievanceTicket>[]>(() => {
    const renderActions = (g: GrievanceTicket) => (
      <Tooltip title="Open">
        <IconButton size="small" aria-label="Open" onClick={() => onOpen(g)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );

    // Only server-allowlisted fields are sortable/filterable
    // (GRIEVANCE_TABLE_CONFIG): sort grievance_no/name/email/subject/status/
    // source/created_at/updated_at; filter the same, status + source as selects.
    return [
      entityIdColumn<GrievanceTicket>({ field: 'grievance_no', headerName: 'Grievance ID' }),
      {
        field: 'subject',
        headerName: 'Subject',
        flex: 1,
        minWidth: 220,
        filter: { type: 'text' },
        cellRenderer: renderSubject,
      },
      { field: 'name', headerName: 'Name', minWidth: 160, filter: { type: 'text' } },
      { field: 'email', headerName: 'Email', minWidth: 200, filter: { type: 'text' } },
      { field: 'phone', headerName: 'Phone', minWidth: 140, sortable: false, filter: { type: 'text' } },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        filter: { type: 'select', options: GRIEVANCE_STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (g) => GRIEVANCE_STATUS_LABEL[g.status],
      },
      {
        field: 'source',
        headerName: 'Source',
        width: 110,
        filter: {
          type: 'select',
          options: [
            { value: 'APP', label: 'App' },
            { value: 'WEBSITE', label: 'Website' },
            { value: 'PORTAL', label: 'Portal' },
            { value: 'EMAIL', label: 'Email' },
          ],
        },
        valueGetter: (g) => SOURCE_LABEL[g.source],
      },
      dateColumn<GrievanceTicket>({
        field: 'created_at',
        headerName: 'Received',
        hide: false,
        minWidth: 180,
        formatDate: formatDateTime,
      }),
      { field: 'actions', headerName: 'Actions', sortable: false, width: 90, cellRenderer: renderActions },
    ];
  }, [formatDateTime, onOpen]);

  return (
    <DuncitTable<GrievanceTicket>
      tableId="legal-grievance-tickets"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText="No grievances raised yet."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search grievance ID, name, email or subject"
      refetchRef={refetchRef}
    />
  );
}
