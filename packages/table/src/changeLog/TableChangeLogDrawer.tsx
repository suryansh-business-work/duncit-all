import { useCallback, useId, useMemo } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable } from '../DuncitTable';
import { useTranslation } from '../i18n';
import type { TableQueryState } from '../types';
import { changeLogColumns } from './changeLogColumns';
import type { TableChangeLogApi, TableChangeLogRow } from './changeLogContext';

export interface TableChangeLogDrawerProps {
  api: TableChangeLogApi;
  /** The `<name>Table` query of the grid whose log this is. */
  table: string;
  tableId: string;
  variables: Record<string, unknown>;
  label?: string;
  onClose: () => void;
}

const rowId = (row: TableChangeLogRow) => row.id;

/** Every recorded change to the grid's rows, in a grid of its own — searchable, filterable, paged. */
export function TableChangeLogDrawer({ api, table, tableId, variables, label, onClose }: Readonly<TableChangeLogDrawerProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const columns = useMemo(() => changeLogColumns(t, api.detailed), [t, api.detailed]);
  // Not registered as a table source, so the log's own grid offers no log of itself.
  const fetchRows = useCallback((q: TableQueryState) => api.fetch(table, variables, q), [api, table, variables]);
  const title = t('shell.table.changeLogsTitle', { vars: { table: label ?? table } });

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{ paper: { 'aria-labelledby': titleId, sx: { width: { xs: '100%', md: api.detailed ? 1100 : 900 } } } }}
    >
      <Stack spacing={1.5} sx={{ p: 2, height: '100%' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography id={titleId} variant="h6" component="h2" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('shell.table.changeLogsIntro')}
            </Typography>
          </Box>
          <DuncitIconButton aria-label={t('shell.table.changeLogsClose')} onClick={onClose}>
            <CloseIcon />
          </DuncitIconButton>
        </Stack>
        <DuncitTable<TableChangeLogRow>
          ariaLabel={title}
          tableId={`${tableId}-change-logs`}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={rowId}
          emptyText={t('shell.table.changeLogsEmpty')}
          defaultSort={{ field: 'created_at', dir: 'desc' }}
        />
      </Stack>
    </Drawer>
  );
}
