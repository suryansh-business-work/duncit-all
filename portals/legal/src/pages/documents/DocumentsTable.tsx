import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DrawIcon from '@mui/icons-material/Draw';
import EditIcon from '@mui/icons-material/Edit';
import { formatDistanceToNow } from 'date-fns';
import { DuncitTable, entityIdColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import type { LegalDocumentListItem } from '../../graphql/documents';

interface Props {
  fetchRows: TableFetch<LegalDocumentListItem>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onOpen: (doc: LegalDocumentListItem) => void;
  /** Open the quick-edit dialog (title + active) for this document. */
  onEdit: (doc: LegalDocumentListItem) => void;
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

const activeValue = (d: LegalDocumentListItem) => (d.is_active ? 'Active' : 'Inactive');

const renderActive = (d: LegalDocumentListItem) => (
  <Chip
    size="small"
    variant={d.is_active ? 'filled' : 'outlined'}
    color={d.is_active ? 'success' : 'default'}
    label={activeValue(d)}
  />
);

const lastUpdatedValue = (d: LegalDocumentListItem) =>
  formatDistanceToNow(new Date(d.updated_at), { addSuffix: true });

// Only server-allowlisted fields are sortable/filterable (LEGAL_DOCUMENT_TABLE_CONFIG):
// sort document_no/name/is_active/document_type/updated_by_name/created_at/updated_at;
// filter document_no/document_type/updated_by_name (text), is_active (boolean),
// created_at/updated_at (date).
type Translate = ReturnType<typeof useTranslation>['t'];

/** Headings are copy, so the base columns are built per translator. */
const baseColumns = (t: Translate): DuncitColumn<LegalDocumentListItem>[] => [
  entityIdColumn<LegalDocumentListItem>({ field: 'document_no', headerName: t('legal.documents.colId') }),
  { field: 'name', headerName: t('legal.documents.colName'), flex: 1, minWidth: 220, cellRenderer: renderName },
  { field: 'document_type', headerName: t('legal.documents.colType'), minWidth: 200, filter: { type: 'text' } },
  {
    field: 'is_active',
    headerName: t('legal.documents.colActive'),
    width: 110,
    filter: { type: 'boolean' },
    cellRenderer: renderActive,
    valueGetter: activeValue,
  },
  {
    field: 'updated_by_name',
    headerName: t('legal.documents.colUpdatedBy'),
    minWidth: 140,
    filter: { type: 'text' },
    valueGetter: updatedByValue,
  },
  { field: 'version_count', headerName: t('legal.documents.colVersions'), sortable: false, width: 100 },
  {
    field: 'updated_at',
    headerName: t('legal.documents.colLastUpdated'),
    minWidth: 150,
    filter: { type: 'date' },
    valueGetter: lastUpdatedValue,
  },
  // Hidden by default — carries the allowlisted created-date filter.
  { field: 'created_at', headerName: t('shell.common.created'), hide: true, filter: { type: 'date' }, minWidth: 150 },
];

export default function DocumentsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onOpen,
  onEdit,
  onSign,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<LegalDocumentListItem>[]>(() => {
    // Stop the row's own click on both: opening the document underneath a
    // dialog would leave two things open on one press.
    const renderActions = (d: LegalDocumentListItem) => (
      <>
        <Tooltip title={d.is_locked ? 'Signed — locked to edits' : 'Edit'}>
          <span>
            <IconButton
              size="small"
              disabled={d.is_locked}
              aria-label={t('shell.common.edit')}
              onClick={(event) => {
                event.stopPropagation();
                onEdit(d);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={d.signing_status === 'SIGNED' ? 'View signed contract' : 'Sign'}>
          <IconButton
            size="small"
            aria-label={t('legal.documents.sign')}
            onClick={(event) => {
              event.stopPropagation();
              onSign(d);
            }}
          >
            <DrawIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </>
    );

    return [
      ...baseColumns(t),
      {
        field: 'signing_status',
        headerName: t('shell.common.status'),
        width: 120,
        sortable: false,
        cellRenderer: renderStatus,
        valueGetter: statusValue,
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        sortable: false,
        width: 120,
        cellRenderer: renderActions,
      },
    ];
  }, [onEdit, onSign, t]);

  return (
    <DuncitTable<LegalDocumentListItem>
      tableId="legal-documents"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getDocumentRowId}
      onRowClick={onOpen}
      toolbarActions={toolbarActions}
      emptyText={t('legal.documents.empty')}
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder="Search document ID, name, type or description"
      refetchRef={refetchRef}
    />
  );
}
