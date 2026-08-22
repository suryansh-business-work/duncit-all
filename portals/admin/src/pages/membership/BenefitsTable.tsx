import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, actionsColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { MembershipBenefitFormValues } from './membership-benefit';
import { useTranslation } from '@duncit/shell';

export interface BenefitRow extends MembershipBenefitFormValues {
  id: string;
  updated_at?: string;
}

interface Props {
  fetchRows: TableFetch<BenefitRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onEdit: (row: BenefitRow) => void;
  onDelete: (row: BenefitRow) => void;
}

const getBenefitRowId = (r: BenefitRow) => r.id;

/** The row's cells as one readable line, so the table shows what it promises
 * without opening the dialog. */
const renderValues = (r: BenefitRow) => (
  <Typography variant="caption" color="text.secondary">
    {(r.values ?? [])
      .map((v) => `${v.plan_key}: ${v.value || '—'}`)
      .join('  ·  ')}
  </Typography>
);

type Translate = ReturnType<typeof useTranslation>['t'];

const renderStatus = (r: BenefitRow, t: Translate) => (
  <Chip
    size="small"
    label={r.is_active ? t('admin.profile.active') : t('admin.profile.inactive')}
    color={r.is_active ? 'success' : 'default'}
  />
);

const renderLabel = (r: BenefitRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={600} component="span">
      {r.label}
    </Typography>
    {renderValues(r)}
  </Stack>
);

export default function BenefitsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<BenefitRow>[]>(
    () => [
      {
        field: 'label',
        headerName: t('admin.membership.benefit'),
        flex: 1,
        minWidth: 320,
        cellRenderer: renderLabel,
        valueGetter: (r) => r.label,
      },
      {
        field: 'group',
        headerName: t('admin.membership.section'),
        filter: { type: 'text' },
        minWidth: 160,
        valueGetter: (r) => r.group,
      },
      {
        field: 'is_active',
        headerName: t('shell.common.status'),
        filter: { type: 'boolean' },
        width: 120,
        cellRenderer: (row: BenefitRow) => renderStatus(row, t),
        valueGetter: (r) => (r.is_active ? t('admin.profile.active') : t('admin.profile.inactive')),
      },
      { field: 'sort_order', headerName: t('admin.podPlans.sort'), width: 90 },
      actionsColumn<BenefitRow>({ onEdit, onDelete }),
    ],
    [onEdit, onDelete]
  );

  return (
    <DuncitTable<BenefitRow>
      tableId="admin-membership-benefits"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getBenefitRowId}
      toolbarActions={toolbarActions}
      emptyText='No comparison rows yet. Click "New row" to create one.'
      defaultSort={{ field: 'sort_order', dir: 'asc' }}
      searchPlaceholder="Search benefit or section"
      refetchRef={refetchRef}
    />
  );
}
