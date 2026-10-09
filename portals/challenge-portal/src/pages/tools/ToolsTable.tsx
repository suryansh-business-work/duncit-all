import { useMemo } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { DuncitTable, actionsColumn, activeChipColumn, clientTableFetch, type DuncitColumn } from '@duncit/table';
import type { ToolRow } from '../../graphql/engine';

interface Props {
  rows: ToolRow[];
  onEdit: (tool: ToolRow) => void;
}

const rowId = (r: ToolRow) => r.id;
const searchOf = (r: ToolRow) => `${r.name} ${r.tool_type} ${r.description}`;

const renderName = (r: ToolRow) => (
  <Box sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="div" sx={{ fontWeight: 700 }}>
      {r.name}
    </Typography>
    <Typography variant="caption" component="div" noWrap sx={{ color: 'text.secondary', maxWidth: 360 }}>
      {r.description}
    </Typography>
  </Box>
);

/** Tool Master: every universal tool, its status, version and how widely it is mapped. */
export default function ToolsTable({ rows, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<ToolRow>[]>(
    () => [
      { field: 'name', headerName: t('challenge.tools.colName'), type: 'text', flex: 1, minWidth: 240, cellRenderer: renderName },
      { field: 'tool_type', headerName: t('challenge.tools.colType'), type: 'text', minWidth: 170 },
      activeChipColumn<ToolRow>({ width: 120, outlineInactive: true, getActive: (r) => r.status === 'ACTIVE' }),
      {
        field: 'engine_ready',
        headerName: t('challenge.tools.colAvailability'),
        type: 'boolean',
        width: 150,
        cellRenderer: (r) => (
          <Chip
            size="small"
            variant={r.engine_ready ? 'filled' : 'outlined'}
            label={t(r.engine_ready ? 'challenge.tools.available' : 'challenge.tools.comingSoon')}
          />
        ),
      },
      { field: 'version', headerName: t('challenge.tools.colVersion'), type: 'number', width: 110 },
      {
        field: 'mapped_category_ids',
        headerName: t('challenge.tools.colMapped'),
        type: 'number',
        width: 150,
        valueGetter: (r) => r.mapped_category_ids.length,
      },
      actionsColumn<ToolRow>({ onEdit, edit: { ariaLabel: t('challenge.tools.configureAria') } }),
    ],
    [onEdit, t]
  );
  const fetchRows = useMemo(() => clientTableFetch<ToolRow>(rows, searchOf, columns), [rows, columns]);

  return (
    <DuncitTable<ToolRow>
      ariaLabel={t('shell.nav.toolMaster')}
      tableId="challenge-portal-tools"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={rowId}
      emptyText={t('challenge.tools.empty')}
      searchPlaceholder={t('challenge.tools.search')}
      defaultSort={{ field: 'name', dir: 'asc' }}
    />
  );
}
