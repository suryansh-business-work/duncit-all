import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import DrawIcon from '@mui/icons-material/Draw';
import EditIcon from '@mui/icons-material/Edit';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import type { LegalDocumentListItem } from '../../graphql/documents';
import { signingStatusOptions } from '../../components/signing';
import { baseColumns } from './documentColumns';

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
    // The Active switch writes on the spot, so the list has to re-read after
    // one — otherwise the row keeps showing the value it just replaced.
    const refresh = () => refetchRef.current?.();

    const signedLabel = (d: LegalDocumentListItem) =>
      d.signing_status === 'SIGNED' ? t('legal.sign.signed') : t('legal.sign.unsigned');

    /** The one thing an operator scans this column for: is it executed yet. */
    const renderStatus = (d: LegalDocumentListItem) => {
      const signed = d.signing_status === 'SIGNED';
      return (
        <Chip
          size="small"
          variant={signed ? 'filled' : 'outlined'}
          color={signed ? 'success' : 'default'}
          label={signedLabel(d)}
        />
      );
    };

    const editTooltip = (d: LegalDocumentListItem) =>
      d.is_locked ? t('legal.sign.locked') : t('shell.common.edit');
    const signTooltip = (d: LegalDocumentListItem) =>
      d.signing_status === 'SIGNED' ? t('legal.sign.viewSigned') : t('legal.sign.action');

    // Stop the row's own click on both: opening the document underneath a
    // dialog would leave two things open on one press.
    const renderActions = (d: LegalDocumentListItem) => (
      <>
        <Tooltip title={editTooltip(d)}>
          <span>
            <DuncitIconButton
              size="small"
              disabled={d.is_locked}
              aria-label={t('shell.common.edit')}
              onClick={(event) => {
                event.stopPropagation();
                onEdit(d);
              }}
            >
              <EditIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
        <Tooltip title={signTooltip(d)}>
          <DuncitIconButton
            size="small"
            aria-label={t('legal.documents.sign')}
            onClick={(event) => {
              event.stopPropagation();
              onSign(d);
            }}
          >
            <DrawIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      </>
    );

    return [
      ...baseColumns(t, refresh),
      {
        field: 'signing_status',
        headerName: t('shell.common.status'),
        width: 120,
        type: 'enum',
        options: signingStatusOptions(t),
        cellRenderer: renderStatus,
        valueGetter: signedLabel,
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        type: 'actions',
        width: 120,
        cellRenderer: renderActions,
      },
    ];
  }, [onEdit, onSign, refetchRef, t]);

  return (
    <DuncitTable<LegalDocumentListItem>
      ariaLabel={t('legal.documents.title')}
      tableId="legal-documents"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getDocumentRowId}
      onRowClick={onOpen}
      toolbarActions={toolbarActions}
      emptyText={t('legal.documents.empty')}
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder={t('legal.documents.search')}
      refetchRef={refetchRef}
    />
  );
}
