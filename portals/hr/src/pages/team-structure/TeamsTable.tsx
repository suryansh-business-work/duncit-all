import { useMemo } from 'react';
import { Typography } from '@mui/material';
import { DuncitTable, actionsColumn, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { money } from './money';
import type { TeamStructureInfo } from './types';

interface Props {
  rows: readonly TeamStructureInfo[];
  onOpen: (team: TeamStructureInfo) => void;
  onEdit: (team: TeamStructureInfo) => void;
  onDelete: (team: TeamStructureInfo) => void;
}

const getRowId = (row: TeamStructureInfo) => row.id;

/** Every team structure; a click on a row opens its chart. */
export default function TeamsTable({ rows, onOpen, onEdit, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<TeamStructureInfo>[]>(
    () => [
      {
        field: 'name',
        headerName: t('hr.teamStructure.list.colName'),
        flex: 1,
        minWidth: 220,
        type: 'text',
        valueGetter: (row) => row.name,
        cellRenderer: (row) => (
          <div>
            <Typography variant="body2" noWrap>{row.name}</Typography>
            {row.description ? (
              <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>{row.description}</Typography>
            ) : null}
          </div>
        ),
      },
      { field: 'seat_count', headerName: t('hr.teamStructure.list.colSeats'), width: 110, type: 'number', valueGetter: (row) => row.seat_count ?? 0 },
      {
        field: 'monthly_cost',
        headerName: t('hr.teamStructure.list.colCost'),
        width: 170,
        type: 'number',
        valueGetter: (row) => row.monthly_cost ?? 0,
        cellRenderer: (row) => <span>{money(row.monthly_cost ?? 0, row.currency)}</span>,
      },
      dateColumn<TeamStructureInfo>({ field: 'updated_at', headerName: t('hr.teamStructure.list.colUpdated'), width: 165, hide: false }),
      actionsColumn<TeamStructureInfo>({
        width: 120,
        onEdit,
        onDelete,
        edit: { title: t('hr.teamStructure.list.rename'), ariaLabel: (row) => t('hr.teamStructure.list.actionsFor', { vars: { name: row.name } }) },
      }),
    ],
    [t, onEdit, onDelete],
  );

  const fetchRows = useMemo(
    () => clientTableFetch(rows, (row) => `${row.name} ${row.description ?? ''}`, columns),
    [rows, columns],
  );

  return (
    <DuncitTable
      tableId="hr-team-structures"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText={t('hr.teamStructure.list.empty')}
      searchPlaceholder={t('hr.teamStructure.list.search')}
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      ariaLabel={t('hr.teamStructure.list.title')}
    />
  );
}
