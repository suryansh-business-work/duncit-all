import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import GppBadOutlinedIcon from '@mui/icons-material/GppBadOutlined';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { tokens, usd } from '../../../lib/usd';
import AuditDrawer from './AuditDrawer';
import ConversationDrawer from './ConversationDrawer';
import { ASK_DUNCIT_AUDIT_TABLE } from './queries';
import { ROLE_KEYS, type AuditRow } from './types';

export type AuditPreset = 'ALL' | 'CHAT' | 'OUT_OF_CONTEXT' | 'VIOLATIONS' | 'ACTIONS';

const SEVERITY_COLOR: Record<string, 'default' | 'warning' | 'error'> = { INFO: 'default', WARN: 'warning', CRITICAL: 'error' };
const TYPES = ['QUERY', 'RESPONSE', 'TOOL_CALL', 'ACTION_PROPOSED', 'ACTION_APPROVED', 'ACTION_REJECTED', 'ACTION_EXECUTED', 'ACTION_FAILED', 'ACTION_ROLLED_BACK', 'VIOLATION', 'OUT_OF_CONTEXT', 'HANDOVER', 'FEEDBACK', 'FEEDBACK_REVIEWED', 'SETTINGS_CHANGED', 'KILL_SWITCH', 'KNOWLEDGE_CHANGED', 'ERROR'];
const VIOLATIONS = ['PROMPT_INJECTION', 'FILE_INJECTION', 'TOOL_OUTPUT_INJECTION', 'UNAUTHORIZED_TOOL', 'UNAUTHORIZED_ACCESS', 'PRIVILEGE_ESCALATION', 'RATE_LIMIT', 'QUOTA_EXCEEDED'];
const options = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

const summary = (row: AuditRow) => row.query || row.reason || row.tool || row.error_message || row.detail;

/**
 * The searchable, filterable audit trail — Chat History & Logs, Out-of-Context
 * Queries and Security & Access Violations are presets of it. A row opens its
 * full record; a row whose tamper-evidence hash no longer matches is marked.
 */
export default function AuditTable({ preset, tableId }: Readonly<{ preset: AuditPreset; tableId: string }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<AuditRow>(client, ASK_DUNCIT_AUDIT_TABLE, 'askDuncitAuditTable', { extraVariables: { preset } }, [preset]);
  const [open, setOpen] = useState<AuditRow | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const columns = useMemo<DuncitColumn<AuditRow>[]>(
    () => [
      dateColumn<AuditRow>({ field: 'created_at', headerName: t('ai.askDuncit.col.when'), width: 165 }),
      {
        field: 'type',
        headerName: t('ai.askDuncit.col.type'),
        width: 170,
        type: 'enum',
        options: options(TYPES),
        valueGetter: (row) => row.type,
        cellRenderer: (row) => <Chip size="small" color={SEVERITY_COLOR[row.severity] ?? 'default'} label={row.violation_kind ?? row.type} />,
      },
      { field: 'violation_kind', headerName: t('ai.askDuncit.col.violation'), width: 180, type: 'enum', options: options(VIOLATIONS), hide: preset !== 'VIOLATIONS', valueGetter: (row) => row.violation_kind ?? '—' },
      { field: 'role_key', headerName: t('ai.askDuncit.col.role'), width: 140, type: 'enum', options: options(ROLE_KEYS), valueGetter: (row) => row.role_key || '—' },
      { field: 'user_name', type: 'text', headerName: t('ai.askDuncit.col.user'), width: 150, sortable: false, valueGetter: (row) => row.user_name || row.user_id || '—' },
      {
        field: 'query',
        type: 'text',
        headerName: t('ai.askDuncit.col.detail'),
        flex: 1,
        minWidth: 260,
        sortable: false,
        valueGetter: summary,
        cellRenderer: (row) => (
          <Typography variant="body2" noWrap title={summary(row)}>
            {summary(row)}
          </Typography>
        ),
      },
      { field: 'model', headerName: t('ai.askDuncit.col.model'), width: 120, type: 'text', valueGetter: (row) => row.model || '—' },
      { field: 'total_tokens', headerName: t('ai.askDuncit.col.tokens'), width: 100, type: 'number', valueGetter: (row) => row.total_tokens, cellRenderer: (row) => tokens(row.total_tokens) },
      { field: 'cost_usd', headerName: t('ai.askDuncit.col.cost'), width: 100, type: 'number', valueGetter: (row) => row.cost_usd, cellRenderer: (row) => usd(row.cost_usd) },
      { field: 'latency_ms', headerName: t('ai.askDuncit.col.latency'), width: 100, type: 'number', valueGetter: (row) => row.latency_ms },
      { field: 'status', headerName: t('ai.askDuncit.col.status'), width: 100, type: 'enum', options: options(['OK', 'FAILED', 'BLOCKED', 'DENIED']), valueGetter: (row) => row.status },
      {
        field: 'intact',
        type: 'boolean',
        headerName: t('ai.askDuncit.col.intact'),
        width: 80,
        sortable: false,
        filterable: false,
        valueGetter: (row) => row.intact,
        cellRenderer: (row) =>
          row.intact ? null : (
            <Tooltip title={t('ai.askDuncit.tampered')}>
              <GppBadOutlinedIcon color="error" fontSize="small" aria-label={t('ai.askDuncit.tampered')} />
            </Tooltip>
          ),
      },
    ],
    [t, preset]
  );

  const getRowId = useCallback((row: AuditRow) => row.id, []);

  return (
    <Box>
      <DuncitTable
        tableId={tableId}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        refetchRef={refetchRef}
        onRowClick={setOpen}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        emptyText={t('ai.askDuncit.emptyAudit')}
      />
      <AuditDrawer row={open} onClose={() => setOpen(null)} onOpenConversation={setConversationId} />
      <ConversationDrawer conversationId={conversationId} onClose={() => setConversationId(null)} />
    </Box>
  );
}
