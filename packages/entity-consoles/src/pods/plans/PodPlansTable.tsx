import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, actionsColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { PodPlanFormValues } from './PodPlanFormDialog';
import { useTranslation } from '@duncit/shell';

export interface PlanRow extends PodPlanFormValues {
  id: string;
  updated_at?: string;
}

interface Props {
  fetchRows: TableFetch<PlanRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (row: PlanRow) => void;
  onDelete: (row: PlanRow) => void;
}

const getPlanRowId = (r: PlanRow) => r.id;

const descriptionSnippet = (r: PlanRow) => {
  if (!r.description) return '';
  const clipped = r.description.slice(0, 60);
  return r.description.length > 60 ? `${clipped}…` : clipped;
};

const renderName = (r: PlanRow) => (
  <Stack direction="row" spacing={1.5} component="span" sx={{
    alignItems: "center"
  }}>
    {r.image_url && (
      <Box
        component="img"
        src={r.image_url}
        alt=""
        sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'cover' }}
      />
    )}
    <Box sx={{ lineHeight: 1.2 }} component="span">
      <Typography
        variant="body2"
        component="span"
        sx={{
          fontWeight: 600,
          display: "block"
        }}>
        {r.name}
      </Typography>
      <Typography
        variant="caption"
        component="span"
        sx={{
          color: "text.secondary",
          display: "block"
        }}>
        {descriptionSnippet(r)}
      </Typography>
    </Box>
  </Stack>
);

const renderKey = (r: PlanRow) => <code>{r.key}</code>;

type Translate = ReturnType<typeof useTranslation>['t'];

const renderStatus = (r: PlanRow, t: Translate) => (
  <Stack direction="row" spacing={0.5} component="span">
    <Chip
      size="small"
      label={r.is_active ? t('admin.profile.active') : t('admin.profile.inactive')}
      color={r.is_active ? 'success' : 'default'}
    />
    {r.is_coming_soon && <Chip size="small" label={t('admin.podPlans.comingSoon')} color="warning" />}
  </Stack>
);

export default function PodPlansTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<PlanRow>[]>(() => {
    return [
      {
        field: 'name',
        headerName: t('shell.common.name'),
        flex: 1,
        minWidth: 220,
        cellRenderer: renderName,
        valueGetter: (r) => r.name,
      },
      {
        field: 'key',
        headerName: t('admin.podPlans.key'),
        filter: { type: 'text' },
        width: 130,
        cellRenderer: renderKey,
        valueGetter: (r) => r.key,
      },
      {
        field: 'price_label',
        headerName: t('admin.podPlans.priceLabel'),
        minWidth: 140,
        valueGetter: (r) => r.price_label || '—',
      },
      {
        field: 'features',
        headerName: t('admin.podPlans.features'),
        sortable: false,
        width: 100,
        valueGetter: (r) => (r.features ?? []).length,
      },
      {
        field: 'is_active',
        headerName: t('shell.common.status'),
        filter: { type: 'boolean' },
        minWidth: 180,
        cellRenderer: (row: PlanRow) => renderStatus(row, t),
        valueGetter: (r) => (r.is_active ? t('admin.profile.active') : t('admin.profile.inactive')),
      },
      {
        field: 'is_coming_soon',
        headerName: t('admin.podPlans.comingSoon'),
        filter: { type: 'boolean' },
        hide: true,
        width: 130,
        valueGetter: (r) => (r.is_coming_soon ? 'Yes' : 'No'),
      },
      { field: 'sort_order', headerName: t('admin.podPlans.sort'), hide: true, width: 90 },
      actionsColumn<PlanRow>({ onEdit, onDelete }),
    ];
  }, [onEdit, onDelete]);

  return (
    <DuncitTable<PlanRow>
      tableId="admin-pod-plans"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPlanRowId}
      toolbarActions={toolbarActions}
      emptyText='No plans yet. Click "New plan" to create one.'
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      searchPlaceholder="Search name or key"
      refetchRef={refetchRef}
    />
  );
}
