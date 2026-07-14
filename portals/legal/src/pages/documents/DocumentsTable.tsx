import type { MutableRefObject, ReactNode } from 'react';
import Typography from '@mui/material/Typography';
import { formatDistanceToNow } from 'date-fns';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { LegalDocumentListItem } from '../../graphql/documents';

interface Props {
  fetchRows: TableFetch<LegalDocumentListItem>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onOpen: (doc: LegalDocumentListItem) => void;
}

const getDocumentRowId = (d: LegalDocumentListItem) => d.id;

const renderName = (d: LegalDocumentListItem) => (
  <Typography variant="body2" fontWeight={700} component="span">
    {d.name}
  </Typography>
);

const updatedByValue = (d: LegalDocumentListItem) => d.updated_by_name || '—';

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
}: Readonly<Props>) {
  return (
    <DuncitTable<LegalDocumentListItem>
      tableId="legal-documents"
      columns={COLUMNS}
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
