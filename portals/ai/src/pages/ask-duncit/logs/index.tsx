import { useMemo } from 'react';
import { Box } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { useTranslation } from '@duncit/shell';
import AuditTable from '../shared/AuditTable';
import ConversationsTable from '../shared/ConversationsTable';
import PageHeader from '../shared/PageHeader';

type Tab = 'conversations' | 'events';
const ID_PREFIX = 'ask-duncit-logs';

/**
 * Ask Duncit › Chat History & Logs — every conversation, and the immutable
 * event trail (questions, answers, tool calls, approvals, failures) with its
 * model, tokens, latency and source.
 */
export default function AskDuncitLogsPage() {
  const { t } = useTranslation();
  const items = useMemo<DuncitTabItem<Tab>[]>(
    () => [
      { value: 'conversations', label: t('ai.askDuncit.logs.tabConversations') },
      { value: 'events', label: t('ai.askDuncit.logs.tabEvents') },
    ],
    [t]
  );
  const tabs = useTabParam<Tab>({ items, fallback: 'conversations' });
  return (
    <Box>
      <PageHeader title={t('ai.askDuncit.logs.title')} subtitle={t('ai.askDuncit.logs.subtitle')} />
      <DuncitTabs {...tabs} idPrefix={ID_PREFIX} aria-label={t('ai.askDuncit.logs.title')} searchable={false} />
      <Box {...tabPanelProps(ID_PREFIX, tabs.value)} sx={{ pt: 2 }}>
        {tabs.value === 'conversations' ? <ConversationsTable live={false} tableId="ai.askDuncit.conversations" /> : <AuditTable preset="ALL" tableId="ai.askDuncit.events" />}
      </Box>
    </Box>
  );
}
