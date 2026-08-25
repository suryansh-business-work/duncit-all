import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, actionsColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { MembershipPlanFormValues } from './membership-plan';
import { useTranslation } from '@duncit/shell';

export interface PlanRow extends MembershipPlanFormValues {
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

const renderName = (r: PlanRow) => (
  <Stack direction="row" spacing={1.25} component="span" sx={{
    alignItems: "center"
  }}>
    <Box
      component="span"
      sx={{
        width: 8,
        height: 28,
        borderRadius: 1,
        flexShrink: 0,
        bgcolor: r.accent_color || 'primary.main',
      }}
    />
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
        {r.tagline}
      </Typography>
    </Box>
  </Stack>
);

const renderKey = (r: PlanRow) => <code>{r.key}</code>;

const renderPrice = (r: PlanRow) => (
  <Box component="span" sx={{ lineHeight: 1.2 }}>
    <Typography
      variant="body2"
      component="span"
      sx={{
        fontWeight: 600,
        display: "block"
      }}>
      {r.price_label || '—'}
    </Typography>
    <Typography
      variant="caption"
      component="span"
      sx={{
        color: "text.secondary",
        display: "block"
      }}>
      {r.price_note}
    </Typography>
  </Box>
);

type Translate = ReturnType<typeof useTranslation>['t'];

const renderStatus = (r: PlanRow, t: Translate) => (
  <Stack direction="row" spacing={0.5} component="span">
    <Chip
      size="small"
      label={r.is_active ? t('admin.profile.active') : t('admin.profile.inactive')}
      color={r.is_active ? 'success' : 'default'}
    />
    {r.badge_label && <Chip size="small" label={r.badge_label} variant="outlined" />}
  </Stack>
);

export default function PlansTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<PlanRow>[]>(
    () => [
      {
        field: 'name',
        headerName: t('admin.membership.tier'),
        flex: 1,
        minWidth: 240,
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
        headerName: t('admin.membership.price'),
        minWidth: 180,
        cellRenderer: renderPrice,
        valueGetter: (r) => r.price_label,
      },
      {
        field: 'is_active',
        headerName: t('shell.common.status'),
        filter: { type: 'boolean' },
        minWidth: 180,
        cellRenderer: (row: PlanRow) => renderStatus(row, t),
        valueGetter: (r) => (r.is_active ? t('admin.profile.active') : t('admin.profile.inactive')),
      },
      { field: 'sort_order', headerName: t('admin.podPlans.sort'), width: 90 },
      actionsColumn<PlanRow>({ onEdit, onDelete }),
    ],
    [onEdit, onDelete]
  );

  return (
    <DuncitTable<PlanRow>
      tableId="admin-membership-plans"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPlanRowId}
      toolbarActions={toolbarActions}
      emptyText='No tiers yet. Click "New tier" to create one.'
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      searchPlaceholder="Search name or key"
      refetchRef={refetchRef}
    />
  );
}
