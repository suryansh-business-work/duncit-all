import { useRef } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader } from '@duncit/ui';
import { useApolloTableFetch } from '@duncit/table';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import StatsStrip from '../StatsStrip';
import BlockedTable from './BlockedTable';
import { CLEAR_EVENTS, EVENTS_TABLE, type RateLimitEventRow } from '../queries';

/**
 * Every breach the limiter has recorded.
 *
 * MONITOR rows sit beside ENFORCE ones on purpose: a rule that is only
 * watching is answering exactly the question you have to answer before turning
 * it on — how often would this have refused somebody.
 */
export default function RateLimitBlockedPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const confirm = useConfirm();
  const [clearEvents] = useMutation<any>(CLEAR_EVENTS);

  const fetchRows = useApolloTableFetch<RateLimitEventRow>(
    client,
    EVENTS_TABLE,
    'rateLimitEventsTable',
  );

  const clear = async () => {
    const ok = await confirm({
      title: t('tech.rateLimit.blocked.clearTitle'),
      message: t('tech.rateLimit.blocked.clearConfirm'),
      destructive: true,
      confirmLabel: t('shell.common.delete'),
    });
    if (!ok) return;
    try {
      await clearEvents();
      refetchRef.current?.();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : t('tech.rateLimit.rules.saveFailed'));
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader title={t('shell.nav.blocked')} subtitle={t('tech.rateLimit.blocked.subtitle')} />
      <StatsStrip />
      <BlockedTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <DuncitButton size="small" color="error" startIcon={<DeleteSweepIcon />} onClick={clear}>
            {t('tech.rateLimit.blocked.clearTitle')}
          </DuncitButton>
        }
      />
    </Stack>
  );
}
