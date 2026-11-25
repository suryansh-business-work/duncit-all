import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
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
import { SERVICE_TARGETS, serviceTargetLabelKeys } from '../../../config/serviceTargets';

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

/** The lead kinds a row shows on, as labels; every kind collapses to "All lead types". */
const targetLabels = (s: CrmServiceOfferedRow, t: Translate): string[] =>
  serviceTargetLabelKeys(s).map((key) => t(key));

const targetLabel = (s: CrmServiceOfferedRow, t: Translate) => targetLabels(s, t).join(', ') || '—';

const renderTitle = (s: CrmServiceOfferedRow) => (
  <Typography variant="body2" component="span" sx={{
    fontWeight: 700
  }}>
    {s.title}
  </Typography>
);

const renderTarget = (s: CrmServiceOfferedRow, t: Translate) => {
  const labels = targetLabels(s, t);
  if (labels.length === 0) return dash(null);
  return (
    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', py: 0.5 }}>
      {labels.map((label) => (
        <Chip key={label} size="small" variant="outlined" color="primary" label={label} />
      ))}
    </Stack>
  );
};

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
      { field: 'title', headerName: t('shell.common.title'), type: 'text', flex: 1, minWidth: 180, cellRenderer: renderTitle, valueGetter: (s) => s.title },
      // The three category names are read from the Category collection per row — nothing stored to order by.
      { field: 'super_category_name', headerName: t('crm.common.superCategory'), type: 'text', sortable: false, minWidth: 150, valueGetter: (s) => dash(s.super_category_name) },
      { field: 'category_name', headerName: t('crm.common.category'), type: 'text', sortable: false, minWidth: 140, valueGetter: (s) => dash(s.category_name) },
      { field: 'sub_category_name', headerName: t('crm.common.subCategory'), type: 'text', sortable: false, minWidth: 140, valueGetter: (s) => dash(s.sub_category_name) },
      // Assembled from the per-kind flags (no stored value) — the hidden per-kind columns sort and filter those.
      { field: 'applies_to', headerName: t('crm.common.appliesTo'), type: 'text', sortable: false, filterable: false, minWidth: 180, cellRenderer: (row: CrmServiceOfferedRow) => renderTarget(row, t), valueGetter: (row: CrmServiceOfferedRow) => targetLabel(row, t) },
      ...SERVICE_TARGETS.map(
        (target): DuncitColumn<CrmServiceOfferedRow> => ({
          field: target.flag,
          headerName: t('crm.data.forLeadType', { vars: { type: t(target.labelKey) } }),
          type: 'boolean',
          hide: true,
          width: 130,
          valueGetter: (s) => (s[target.flag] ? t('shell.common.yes') : t('shell.common.no')),
        })
      ),
      activeChipColumn<CrmServiceOfferedRow>(),
      { field: 'sort_order', headerName: t('crm.data.sort'), type: 'number', hide: true, width: 90 },
      dateColumn<CrmServiceOfferedRow>(),
      actionsColumn<CrmServiceOfferedRow>({
        onEdit,
        onDelete,
        edit: { ariaLabel: (s) => t('crm.common.editNamed', { vars: { name: s.title } }) },
        delete: { ariaLabel: (s) => t('crm.common.deleteNamed', { vars: { name: s.title } }) },
      }),
    ],
    [onEdit, onDelete, t],
  );

  return (
    <DuncitTable<CrmServiceOfferedRow>
      ariaLabel={t('shell.nav.servicesOffered')}
      tableId="crm-services-offered"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getServiceRowId}
      toolbarActions={toolbarActions}
      emptyText={t('crm.data.noServicesYet')}
      searchPlaceholder={t('crm.data.searchServices')}
      refetchRef={refetchRef}
    />
  );
}
