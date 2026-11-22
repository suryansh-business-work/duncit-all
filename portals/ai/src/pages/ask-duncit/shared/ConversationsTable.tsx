import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { tokens, usd } from '../../../lib/usd';
import ConversationDrawer from './ConversationDrawer';
import { ASK_DUNCIT_CONVERSATIONS_TABLE } from './queries';
import { ROLE_KEYS, type ConversationRow } from './types';

const options = (values: readonly string[]) => values.map((value) => ({ value, label: value }));
const LIVE_POLL_MS = 10_000;

/**
 * Ask Duncit conversations. `live` keeps only those active in the last few
 * minutes (or still answering) and refreshes on its own.
 */
export default function ConversationsTable({ live, tableId }: Readonly<{ live: boolean; tableId: string }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<ConversationRow>(client, ASK_DUNCIT_CONVERSATIONS_TABLE, 'askDuncitConversationsTable', { extraVariables: { live } }, [live]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => refetchRef.current?.(), LIVE_POLL_MS);
    return () => clearInterval(timer);
  }, [live]);

  const columns = useMemo<DuncitColumn<ConversationRow>[]>(
    () => [
      dateColumn<ConversationRow>({ field: 'last_message_at', headerName: t('ai.askDuncit.col.lastMessage'), width: 165 }),
      {
        field: 'title',
        type: 'text',
        headerName: t('ai.askDuncit.col.conversation'),
        flex: 1,
        minWidth: 260,
        valueGetter: (row) => row.title,
        cellRenderer: (row) => (
          <Stack>
            <Typography variant="body2" noWrap title={row.title}>
              {row.title || t('ai.askDuncit.untitled')}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }} title={row.last_message_preview}>
              {row.last_message_preview}
            </Typography>
          </Stack>
        ),
      },
      { field: 'role_key', headerName: t('ai.askDuncit.col.role'), width: 140, type: 'enum', options: options(ROLE_KEYS), valueGetter: (row) => row.role_key },
      { field: 'surface', headerName: t('ai.askDuncit.col.surface'), width: 100, type: 'enum', options: options(['MWEB', 'NATIVE', 'PORTAL']), valueGetter: (row) => row.surface },
      {
        field: 'status',
        headerName: t('ai.askDuncit.col.status'),
        width: 140,
        type: 'enum',
        options: options(['ACTIVE', 'HANDED_OVER', 'ARCHIVED']),
        valueGetter: (row) => row.status,
        cellRenderer: (row) => <Chip size="small" color={row.generating ? 'info' : 'default'} label={row.generating ? t('ai.askDuncit.generating') : row.status} />,
      },
      { field: 'message_count', headerName: t('ai.askDuncit.col.messages'), width: 100, type: 'number', valueGetter: (row) => row.message_count },
      { field: 'flags', type: 'text', headerName: t('ai.askDuncit.col.flags'), width: 120, sortable: false, filterable: false, valueGetter: (row) => `${row.out_of_context_count}/${row.violation_count}` },
      { field: 'feedback', type: 'text', headerName: t('ai.askDuncit.col.feedback'), width: 100, sortable: false, filterable: false, valueGetter: (row) => t('ai.askDuncit.thumbs', { vars: { up: row.thumbs_up, down: row.thumbs_down } }) },
      { field: 'cost_usd', headerName: t('ai.askDuncit.col.cost'), width: 110, type: 'number', valueGetter: (row) => row.cost_usd, cellRenderer: (row) => `${usd(row.cost_usd)} · ${tokens(row.total_tokens)}` },
    ],
    [t]
  );
  const getRowId = useCallback((row: ConversationRow) => row.id, []);

  return (
    <>
      <DuncitTable
        tableId={tableId}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        refetchRef={refetchRef}
        onRowClick={(row) => setOpenId(row.id)}
        defaultSort={{ field: 'last_message_at', dir: 'desc' }}
        emptyText={t(live ? 'ai.askDuncit.emptyLive' : 'ai.askDuncit.emptyConversations')}
      />
      <ConversationDrawer conversationId={openId} onClose={() => setOpenId(null)} pollMs={live ? LIVE_POLL_MS : undefined} />
    </>
  );
}
