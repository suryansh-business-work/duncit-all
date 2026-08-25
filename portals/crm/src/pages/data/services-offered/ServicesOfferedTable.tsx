import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Typography } from '@mui/material';
import {
  DuncitTable,
  actionsColumn,
  activeChipColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import type { CrmServiceOfferedRow } from '../../../api/data.gql';
import { useTranslation } from '@duncit/shell';

interface Props {
  fetchRows: TableFetch<CrmServiceOfferedRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (service: CrmServiceOfferedRow) => void;
  onDelete: (service: CrmServiceOfferedRow) => void;
}

const getServiceRowId = (s: CrmServiceOfferedRow) => s.id;

const dash = (v?: string | null) => (v?.trim() ? v : '—');

type Translate = ReturnType<typeof useTranslation>['t'];

const targetLabel = (s: CrmServiceOfferedRow, t: Translate) => {
  if (s.applies_to_venue && s.applies_to_host) return 'Both';
  if (s.applies_to_venue) return t('crm.common.venue');
  if (s.applies_to_host) return 'Host';
  return '—';
};

const renderTitle = (s: CrmServiceOfferedRow) => (
  <Typography variant="body2" component="span" sx={{
    fontWeight: 700
  }}>
    {s.title}
  </Typography>
);

const renderTarget = (s: CrmServiceOfferedRow, t: Translate) => (
  <Chip size="small" variant="outlined" color="primary" label={targetLabel(s, t)} />
);

/** Services Offered on the shared server-driven table — Title plus its Super → Category → Sub. */
export default function ServicesOfferedTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<CrmServiceOfferedRow>[]>(
    () => [
      { field: 'title', headerName: t('shell.common.title'), flex: 1, minWidth: 180, cellRenderer: renderTitle, valueGetter: (s) => s.title },
      { field: 'super_category_name', headerName: t('crm.common.superCategory'), sortable: false, minWidth: 150, valueGetter: (s) => dash(s.super_category_name) },
      { field: 'category_name', headerName: t('crm.common.category'), sortable: false, minWidth: 140, valueGetter: (s) => dash(s.category_name) },
      { field: 'sub_category_name', headerName: t('crm.common.subCategory'), sortable: false, minWidth: 140, valueGetter: (s) => dash(s.sub_category_name) },
      { field: 'applies_to', headerName: t('crm.common.appliesTo'), sortable: false, width: 110, cellRenderer: (row: CrmServiceOfferedRow) => renderTarget(row, t), valueGetter: (row: CrmServiceOfferedRow) => targetLabel(row, t) },
      { field: 'applies_to_venue', headerName: t('crm.data.forVenue'), filter: { type: 'boolean' }, hide: true, width: 110, valueGetter: (s) => (s.applies_to_venue ? 'Yes' : 'No') },
      { field: 'applies_to_host', headerName: t('crm.data.forHost'), filter: { type: 'boolean' }, hide: true, width: 110, valueGetter: (s) => (s.applies_to_host ? 'Yes' : 'No') },
      activeChipColumn<CrmServiceOfferedRow>(),
      { field: 'sort_order', headerName: t('crm.data.sort'), hide: true, width: 90 },
      dateColumn<CrmServiceOfferedRow>(),
      actionsColumn<CrmServiceOfferedRow>({
        onEdit,
        onDelete,
        edit: { ariaLabel: (s) => `Edit ${s.title}` },
        delete: { ariaLabel: (s) => `Delete ${s.title}` },
      }),
    ],
    [onEdit, onDelete],
  );

  return (
    <DuncitTable<CrmServiceOfferedRow>
      tableId="crm-services-offered"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getServiceRowId}
      toolbarActions={toolbarActions}
      emptyText='No services yet. Click "Add Service Offered" to create your first one.'
      searchPlaceholder="Search title or slug"
      refetchRef={refetchRef}
    />
  );
}
