import { useCallback, useEffect, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Grid, Stack, Typography } from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { useBackgroundJobs, useTranslation } from '@duncit/shell';
import { useApolloTableFetch } from '@duncit/table';
import { CRM_EMAIL_VERIFICATIONS_TABLE, type CrmEmailVerification } from '../../../api/emailVerification.gql';
import { useEmailStatusStore } from '../../../components/email-status';
import { BulkCheckCard } from './BulkCheckCard';
import { HistoryTable } from './HistoryTable';
import { SingleCheckCard } from './SingleCheckCard';

/** How often the history reloads while a bulk check is running. */
const HISTORY_POLL_MS = 5000;

/**
 * Tools → Email Verifier. Checks addresses against their mail servers through
 * the self-hosted Reacher service — one at a time, or a whole CSV as a
 * background job — and keeps a record of every check. The newest verdict is
 * the badge shown beside that email across the CRM.
 */
export default function EmailVerifierPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const store = useEmailStatusStore();
  const refetchRef = useRef<(() => void) | null>(null);
  const fetchRows = useApolloTableFetch<CrmEmailVerification>(
    client,
    CRM_EMAIL_VERIFICATIONS_TABLE,
    'crmEmailVerificationsTable'
  );
  const running = (useBackgroundJobs()?.jobs ?? []).filter(
    (job) => job.kind === 'EMAIL_VERIFY' && job.status === 'RUNNING'
  ).length;

  const refreshHistory = useCallback(() => refetchRef.current?.(), []);

  // A bulk check that just finished wrote new verdicts: reload the history and
  // let every badge ask for its status again.
  const wasRunning = useRef(running);
  useEffect(() => {
    if (running < wasRunning.current) {
      refreshHistory();
      store?.reset();
    }
    wasRunning.current = running;
  }, [running, refreshHistory, store]);

  // While one runs, its rows land in the history as they are checked.
  useEffect(() => {
    if (running === 0) return undefined;
    const timer = globalThis.setInterval(refreshHistory, HISTORY_POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, [running, refreshHistory]);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <MarkEmailReadIcon color="primary" />
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
            {t('shell.nav.emailVerifier')}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.emailVerifier.subtitle')}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SingleCheckCard onChecked={refreshHistory} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <BulkCheckCard running={running} />
        </Grid>
      </Grid>

      <Box>
        <Typography component="h2" variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          {t('crm.emailVerifier.historyTitle')}
        </Typography>
        <HistoryTable fetchRows={fetchRows} refetchRef={refetchRef} />
      </Box>
    </Stack>
  );
}
