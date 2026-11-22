import { useState } from 'react';
import { Chip, List, ListItemButton, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { tokens, usd } from '../../lib/usd';
import { millis } from '../../components/charts/summaries';
import OpenAiLogDrawer from '../openai-logs/OpenAiLogDrawer';
import { STATUS_COLOR } from '../openai-logs/queries';
import type { OverviewActivity } from './queries';

/**
 * The latest OpenAI calls, newest first. Each row opens the same drawer the
 * OpenAI Logs page opens, with the prompt and the answer — which this list
 * never carries itself.
 */
export default function RecentCalls({ calls }: Readonly<{ calls: readonly OverviewActivity[] }>) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const ms = millis(t);

  if (calls.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('ai.overview.noRecent')}
      </Typography>
    );
  }
  return (
    <>
      <List dense disablePadding>
        {calls.map((call) => {
          const when = formatDateTime(call.created_at);
          return (
            <ListItemButton
              key={call.id}
              divider
              onClick={() => setOpenId(call.id)}
              aria-label={t('ai.overview.openRow', { vars: { task: call.task_label, when } })}
            >
              <Stack spacing={0.25} sx={{ minWidth: 0, width: '100%' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                  <Chip size="small" label={call.status} color={STATUS_COLOR[call.status] ?? 'default'} />
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {call.task_label}
                  </Typography>
                  {call.model && (
                    <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
                      {call.model}
                    </Typography>
                  )}
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('ai.overview.recentMeta', {
                    vars: { when, tokens: tokens(call.total_tokens), cost: usd(call.cost_usd), ms: ms(call.duration_ms) },
                  })}
                </Typography>
                {call.error_message && (
                  <Typography variant="caption" sx={{ color: 'error.main', wordBreak: 'break-word' }}>
                    {call.error_message}
                  </Typography>
                )}
              </Stack>
            </ListItemButton>
          );
        })}
      </List>
      <OpenAiLogDrawer logId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
