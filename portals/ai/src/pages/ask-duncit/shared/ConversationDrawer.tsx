import { useQuery } from '@apollo/client/react';
import { Box, Chip, Divider, Drawer, Stack, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { usd } from '../../../lib/usd';
import { ASK_DUNCIT_CONVERSATION_DETAIL } from './queries';
import type { AuditRow, ConversationRow } from './types';

interface Detail {
  conversation: ConversationRow;
  messages: Array<{ id: string; role: string; status: string; content: string; tool_calls: string[]; model: string; tokens: number; latency_ms: number; confidence: number | null; out_of_context: boolean; feedback_rating: string | null; attachments: number; created_at: string }>;
  actions: Array<{ id: string; tool_title: string; risk: string; status: string; args_preview: string; error_message: string; created_at: string }>;
  events: AuditRow[];
}

interface Props {
  conversationId: string | null;
  onClose: () => void;
  /** Live Conversations re-reads every few seconds. */
  pollMs?: number;
}

/** One conversation as an operator sees it — masked transcript, actions and its audit events. */
export default function ConversationDrawer({ conversationId, onClose, pollMs }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { data, loading, error } = useQuery<{ askDuncitConversationDetail: Detail | null }>(ASK_DUNCIT_CONVERSATION_DETAIL, {
    variables: { id: conversationId },
    skip: !conversationId,
    pollInterval: pollMs,
    fetchPolicy: 'cache-and-network',
  });
  const detail = data?.askDuncitConversationDetail;

  return (
    <Drawer anchor="right" open={Boolean(conversationId)} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', md: 640 }, p: 2 } } }}>
      <QueryGuard loading={loading && !detail} error={error} errorText={t('ai.askDuncit.loadFailed')} spinnerSx={{ py: 6 }}>
        {() =>
          detail ? (
            <Stack spacing={1.5}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                {detail.conversation.title || t('ai.askDuncit.untitled')}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Chip size="small" label={detail.conversation.role_key} />
                <Chip size="small" label={detail.conversation.surface} />
                <Chip size="small" label={detail.conversation.status} />
                <Chip size="small" label={`${detail.conversation.total_tokens} · ${usd(detail.conversation.cost_usd)}`} />
                {detail.conversation.generating && <Chip size="small" color="info" label={t('ai.askDuncit.generating')} />}
              </Stack>
              <Divider />
              {detail.messages.map((m) => (
                <Box key={m.id} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: m.role === 'user' ? 'action.hover' : 'background.paper', border: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {`${m.role} · ${formatDateTime(m.created_at)} · ${m.status}${m.model ? ` · ${m.model} · ${m.tokens} · ${m.latency_ms} ms` : ''}${m.confidence === null ? '' : ` · ${Math.round(m.confidence * 100)}%`}`}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {m.content}
                  </Typography>
                  {m.tool_calls.length > 0 && (
                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                      {m.tool_calls.join(' · ')}
                    </Typography>
                  )}
                  {(m.out_of_context || m.feedback_rating) && (
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                      {m.out_of_context && <Chip size="small" color="warning" label={t('ai.askDuncit.outOfContext')} />}
                      {m.feedback_rating && <Chip size="small" label={m.feedback_rating} />}
                    </Stack>
                  )}
                </Box>
              ))}
              {detail.actions.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="subtitle2">{t('ai.askDuncit.actions')}</Typography>
                  {detail.actions.map((a) => (
                    <Typography key={a.id} variant="body2">{`${a.tool_title} · ${a.risk} · ${a.status}${a.error_message ? ` · ${a.error_message}` : ''}`}</Typography>
                  ))}
                </>
              )}
              <Divider />
              <Typography variant="subtitle2">{t('ai.askDuncit.events')}</Typography>
              {detail.events.map((e) => (
                <Typography key={e.id} variant="caption" sx={{ display: 'block', color: e.intact ? 'text.secondary' : 'error.main' }}>
                  {`${formatDateTime(e.created_at)} · ${e.violation_kind ?? e.type} · ${e.status}${e.tool ? ` · ${e.tool}` : ''}`}
                </Typography>
              ))}
            </Stack>
          ) : null
        }
      </QueryGuard>
    </Drawer>
  );
}
