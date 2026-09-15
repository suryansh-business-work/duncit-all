import Typography from '@mui/material/Typography';
import { formatDistanceToNow } from 'date-fns';
import { entityIdColumn, type DuncitColumn } from '@duncit/table';
import type { useTranslation } from '@duncit/shell';
import type { LegalDocumentListItem } from '../../graphql/documents';
import DocumentActiveSwitch from './DocumentActiveSwitch';

const renderName = (d: LegalDocumentListItem) => (
  <Typography variant="body2" component="span" sx={{
    fontWeight: 700
  }}>
    {d.name}
  </Typography>
);

const updatedByValue = (d: LegalDocumentListItem) => d.updated_by_name || '—';

const lastUpdatedValue = (d: LegalDocumentListItem) =>
  formatDistanceToNow(new Date(d.updated_at), { addSuffix: true });

// Sort and filter keys are allowlisted on the server (LEGAL_DOCUMENT_TABLE_CONFIG);
// signing_status is derived from signed_at and matched by liftSigningStatusFilter.
type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Headings are copy, so the base columns are built per translator.
 *
 * `onActiveChanged` is threaded down to the Active column because the switch
 * writes on the spot: a toggle whose row still reads the old value is a toggle
 * people press twice.
 */
export const baseColumns = (
  t: Translate,
  onActiveChanged: () => void
): DuncitColumn<LegalDocumentListItem>[] => [
  entityIdColumn<LegalDocumentListItem>({ field: 'document_no', headerName: t('legal.documents.colId') }),
  { field: 'name', headerName: t('legal.documents.colName'), type: 'text', flex: 1, minWidth: 220, cellRenderer: renderName },
  { field: 'document_type', headerName: t('legal.documents.colType'), minWidth: 200, type: 'text' },
  {
    field: 'is_active',
    headerName: t('legal.documents.colActive'),
    width: 150,
    type: 'boolean',
    cellRenderer: (d) => (
      <DocumentActiveSwitch
        documentId={d.id}
        isActive={d.is_active}
        onChanged={onActiveChanged}
      />
    ),
    valueGetter: (d) => (d.is_active ? t('shell.common.active') : t('shell.common.inactive')),
  },
  {
    field: 'updated_by_name',
    headerName: t('legal.documents.colUpdatedBy'),
    minWidth: 140,
    type: 'text',
    // Resolved from the stored user id per row — no name to order or match on.
    sortable: false,
    filterable: false,
    valueGetter: updatedByValue,
  },
  {
    field: 'version_count',
    headerName: t('legal.documents.colVersions'),
    type: 'number',
    // The length of the embedded versions array, counted when the row is read.
    sortable: false,
    filterable: false,
    width: 100,
  },
  {
    field: 'updated_at',
    headerName: t('legal.documents.colLastUpdated'),
    minWidth: 150,
    type: 'date',
    valueGetter: lastUpdatedValue,
  },
  // Hidden by default — carries the allowlisted created-date filter.
  { field: 'created_at', headerName: t('shell.common.created'), hide: true, type: 'date', minWidth: 150 },
];
