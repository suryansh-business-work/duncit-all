import { useEffect, useMemo, useRef } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { StatusChip } from '@duncit/ui';
import { DuncitTable, actionsColumn, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import type { ExpenseOptionRow } from '../expense-config';

const getRowId = (row: ExpenseOptionRow) => row.id;

/** Built-in rows and rows an expense already uses can never be deleted. */
const isLocked = (row: ExpenseOptionRow) => row.is_system || (row.usage_count ?? 0) > 0;

const ACTIVE_COLORS = { ON: 'success', OFF: 'default' } as const;

/** The display name, over the key every expense filed under it carries. */
const renderOption = (row: ExpenseOptionRow) => (
  <Stack component="span" sx={{ alignItems: 'flex-start', lineHeight: 1.2 }}>
    <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
      {row.label}
    </Typography>
    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
      {row.key}
    </Typography>
  </Stack>
);

interface Props {
  rows: ExpenseOptionRow[];
  showSource: boolean;
  onEdit: (row: ExpenseOptionRow) => void;
  onDelete: (row: ExpenseOptionRow) => void;
}

/** One configured list, as Finance edits it. */
export default function ExpenseOptionTable({
  rows,
  showSource,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // clientTableFetch searches the text this returns, so both halves of the row
  // identity are in it: an admin looks for "Food" and for FOOD_AND_BEVERAGE.
  const fetchRows = useMemo(
    () => clientTableFetch(rows, (row) => [row.label, row.key, row.entity_source].join(" ")),
    [rows],
  );
  // The grid holds fetchRows in a ref, so a new list is only picked up when the
  // page asks it to re-read (the same arrangement the WhatsApp console uses).
  const refetchRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    refetchRef.current?.();
  }, [fetchRows]);

  const columns = useMemo<DuncitColumn<ExpenseOptionRow>[]>(() => {
    const lockedTitle = t('finance.expenseConfig.cannotDelete');
    const renderActive = (row: ExpenseOptionRow) => (
      <StatusChip
        status={row.is_active ? 'ON' : 'OFF'}
        colorMap={ACTIVE_COLORS}
        label={row.is_active ? t('finance.expenseConfig.offered') : t('finance.expenseConfig.hidden')}
      />
    );
    const renderUsage = (row: ExpenseOptionRow) => (
      <Typography
        variant="body2"
        component="span"
        color={(row.usage_count ?? 0) > 0 ? 'text.primary' : 'text.secondary'}
      >
        {row.usage_count ?? 0}
      </Typography>
    );
    const renderBuiltIn = (row: ExpenseOptionRow) =>
      row.is_system ? (
        <Chip size="small" variant="outlined" label={t('finance.expenseConfig.builtIn')} />
      ) : null;
    const base: DuncitColumn<ExpenseOptionRow>[] = [
      {
        field: 'label',
        headerName: t('finance.expenseConfig.option'),
        flex: 1,
        minWidth: 220,
        cellRenderer: renderOption,
        valueGetter: (row) => row.label,
      },
      {
        field: 'is_active',
        headerName: t('shell.common.status'),
        width: 130,
        cellRenderer: renderActive,
        valueGetter: (row) => (row.is_active ? 1 : 0),
      },
      {
        field: 'usage_count',
        headerName: t('finance.expenseConfig.usedBy'),
        width: 120,
        cellRenderer: renderUsage,
        valueGetter: (row) => row.usage_count ?? 0,
      },
      {
        field: 'is_system',
        headerName: t('finance.expenseConfig.origin'),
        width: 120,
        sortable: false,
        cellRenderer: renderBuiltIn,
        valueGetter: (row) => (row.is_system ? 1 : 0),
      },
      actionsColumn<ExpenseOptionRow>({
        onEdit,
        onDelete,
        delete: { disabled: isLocked, disabledTitle: lockedTitle },
      }),
    ];
    if (!showSource) return base;
    const sourceColumn: DuncitColumn<ExpenseOptionRow> = {
      field: 'entity_source',
      headerName: t('finance.expenseConfig.entitySource'),
      width: 160,
      valueGetter: (row) => row.entity_source || '—',
    };
    return [base[0], sourceColumn, ...base.slice(1)];
  }, [t, onEdit, onDelete, showSource]);

  return (
    <DuncitTable<ExpenseOptionRow>
      tableId="finance-expense-options"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      refetchRef={refetchRef}
      emptyText={t('finance.expenseConfig.noOptionsYet')}
      defaultSort={{ field: 'label', dir: 'asc' }}
      searchPlaceholder={t('finance.expenseConfig.searchOptions')}
    />
  );
}
