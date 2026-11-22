import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import PageHeader from '../shared/PageHeader';
import RoleSelect from '../shared/RoleSelect';
import { SET_ASK_DUNCIT_TOOL_ACCESS } from '../shared/mutations';
import { ASK_DUNCIT_TOOL_TABLE } from '../shared/queries';
import type { RoleKey, ToolRow } from '../shared/types';
import { useCanControl } from '../shared/useCanControl';
import ToolAccessCell from './ToolAccessCell';

const RISK_COLOR: Record<string, 'default' | 'warning' | 'error'> = { READ: 'default', WRITE: 'warning', DESTRUCTIVE: 'error' };
const RISK_OPTIONS = ['READ', 'WRITE', 'DESTRUCTIVE'].map((value) => ({ value, label: value }));

/**
 * Ask Duncit › MCP & Tool Management — every MCP tool the assistant could
 * reach, as one role's policy sees it: allowed or not, approval or not, and
 * how it has been used. Per person, the MCP console rules and each resolver's
 * own RBAC still apply on top.
 */
export default function AskDuncitToolsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const canControl = useCanControl();
  const [role, setRole] = useState<RoleKey>('MEMBER');
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<ToolRow>(client, ASK_DUNCIT_TOOL_TABLE, 'askDuncitToolTable', { extraVariables: { role } }, [role]);
  const [setAccess] = useMutation(SET_ASK_DUNCIT_TOOL_ACCESS);

  const change = useCallback(
    (row: ToolRow, access: 'ALLOW' | 'BLOCK' | 'DEFAULT', forceApproval: boolean | null) => {
      setAccess({ variables: { role, tool: row.name, access, forceApproval } })
        .then(() => refetchRef.current?.())
        .catch((error: unknown) => notifyError(parseApiError(error) || t('ai.askDuncit.saveFailed')));
    },
    [setAccess, role, t]
  );

  const columns = useMemo<DuncitColumn<ToolRow>[]>(
    () => [
      {
        field: 'name',
        type: 'text',
        headerName: t('ai.askDuncit.tools.tool'),
        flex: 1,
        minWidth: 280,
        valueGetter: (row) => row.name,
        cellRenderer: (row) => (
          <Stack>
            <Typography variant="body2" noWrap title={row.summary}>
              {row.title}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
              {row.name}
            </Typography>
          </Stack>
        ),
      },
      { field: 'category', headerName: t('ai.askDuncit.tools.area'), width: 150, type: 'text', valueGetter: (row) => row.category_label },
      {
        field: 'risk',
        headerName: t('ai.askDuncit.tools.risk'),
        width: 130,
        type: 'enum',
        options: RISK_OPTIONS,
        valueGetter: (row) => row.risk,
        cellRenderer: (row) => <Chip size="small" color={RISK_COLOR[row.risk] ?? 'default'} label={row.risk} />,
      },
      { field: 'calls', headerName: t('ai.askDuncit.tools.calls'), width: 100, type: 'number', valueGetter: (row) => row.calls },
      { field: 'failures', headerName: t('ai.askDuncit.tools.failures'), width: 100, type: 'number', valueGetter: (row) => row.failures },
      {
        field: 'allowed',
        headerName: t('ai.askDuncit.tools.access'),
        width: 140,
        type: 'boolean',
        valueGetter: (row) => row.allowed,
        cellRenderer: (row) => (
          <ToolAccessCell row={row} disabled={!canControl} onAccess={(r, access) => change(r, access, null)} onApproval={(r, force) => change(r, 'DEFAULT', force)} />
        ),
      },
    ],
    [t, canControl, change]
  );
  const getRowId = useCallback((row: ToolRow) => row.name, []);

  return (
    <Box>
      <PageHeader title={t('ai.askDuncit.tools.title')} subtitle={t('ai.askDuncit.tools.subtitle')} actions={<RoleSelect value={role} onChange={setRole} />} />
      {!canControl && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('ai.askDuncit.readOnlyControl')}
        </Alert>
      )}
      <DuncitTable tableId={`ai.askDuncit.tools.${role}`} columns={columns} fetchRows={fetchRows} getRowId={getRowId} refetchRef={refetchRef} defaultSort={{ field: 'calls', dir: 'desc' }} emptyText={t('ai.askDuncit.noData')} />
    </Box>
  );
}
