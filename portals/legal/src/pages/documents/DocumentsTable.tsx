import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DrawIcon from '@mui/icons-material/Draw';
import { formatDistanceToNow } from 'date-fns';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { LegalDocumentListItem } from '../../graphql/documents';

interface Props {
  fetchRows: TableFetch<LegalDocumentListItem>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onOpen: (doc: LegalDocumentListItem) => void;
  /** Open the signing workflow for this contract. */
  onSign: (doc: LegalDocumentListItem) => void;
}

const getDocumentRowId = (d: LegalDocumentListItem) => d.id;

const renderName = (d: LegalDocumentListItem) => (
  <Typography variant="body2" fontWeight={700} component="span">
    {d.name}
  </Typography>
);

const updatedByValue = (d: LegalDocumentListItem) => d.updated_by_name || '—';

const statusValue = (d: LegalDocumentListItem) =>
  d.signing_status === 'SIGNED' ? 'Signed' : 'Unsigned';

/** The one thing an operator scans this column for: is it executed yet. */
const renderStatus = (d: LegalDocumentListItem) => {
  const signed = d.signing_status === 'SIGNED';
  return (
    <Chip
      size="small"
      variant={signed ? 'filled' : 'outlined'}
      color={signed ? 'success' : 'default'}
      label={signed ? 'Signed' : 'Unsigned'}
    />
  );
};

const lastUpdatedValue = (d: LegalDocumentListItem) =>
  formatDistanceToNow(new Date(d.updated_at), { addSuffix: true });

// Only server-allowlisted fields are sortable/filterable (LEGAL_DOCUMENT_TABLE_CONFIG):
// sort name/document_type/updated_by_name/created_at/updated_at; filter
// document_type/updated_by_name (text) + created_at/updated_at (date).
const COLUMNS: DuncitColumn<LegalDocumentListItem>[] = [
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 220, cellRenderer: renderName },
  { field: 'document_type', headerName: 'Type', minWidth: 200, filter: { type: 'text' } },
  {
    field: 'updated_by_name',
    headerName: 'Updated by',
    minWidth: 140,
    filter: { type: 'text' },
    valueGetter: updatedByValue,
  },
  { field: 'version_count', headerName: 'Versions', sortable: false, width: 100 },
  {
    field: 'updated_at',
    headerName: 'Last updated',
    minWidth: 150,
    filter: { type: 'date' },
    valueGetter: lastUpdatedValue,
  },
  // Hidden by default — carries the allowlisted created-date filter.
  { field: 'created_at', headerName: 'Created', hide: true, filter: { type: 'date' }, minWidth: 150 },
];

export default function DocumentsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onOpen,
  onSign,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<LegalDocumentListItem>[]>(() => {
    const renderActions = (d: LegalDocumentListItem) => (
      <Tooltip title={d.signing_status === 'SIGNED' ? 'View signed contract' : 'Sign'}>
        {/* Stop the row's own click: opening the editor underneath the signing
            dialog would leave two things open on one press. */}
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onSign(d);
          }}
        >
          <DrawIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );

    return [
      ...COLUMNS,
      {
        field: 'signing_status',
        headerName: 'Status',
        width: 120,
        sortable: false,
        cellRenderer: renderStatus,
        valueGetter: statusValue,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        width: 100,
        cellRenderer: renderActions,
      },
    ];
  }, [onSign]);

  return (
    <DuncitTable<LegalDocumentListItem>
      tableId="legal-documents"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getDocumentRowId}
      onRowClick={onOpen}
      toolbarActions={toolbarActions}
      emptyText="No documents yet."
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder="Search name, type or description"
      refetchRef={refetchRef}
    />
  );
}
