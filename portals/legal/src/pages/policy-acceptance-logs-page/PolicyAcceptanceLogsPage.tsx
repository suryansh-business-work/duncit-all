import { useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { PageHeader } from '@duncit/ui';
import { POLICY_ACCEPTANCES_TABLE, type PolicyAcceptance } from '../../graphql/policyAcceptance';
import PolicyAcceptanceLogsTable from './PolicyAcceptanceLogsTable';
import AcceptanceDetailDialog from './detail/AcceptanceDetailDialog';

/**
 * Legal > Policy Acceptance Logs — the append-only record of who accepted which
 * policy, and when.
 *
 * Clicking a row opens everything behind it. The table can only ever show what
 * fits in a column; the questions this log is actually opened for — which
 * wording did they agree to, has it changed since, what else have they
 * accepted — need the record, not the row.
 */
export default function PolicyAcceptanceLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  // Admin-configured format and time zone, so an acceptance timestamp quoted
  // from here matches the one quoted from anywhere else in the platform.
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchRows = useApolloTableFetch<PolicyAcceptance>(
    client,
    POLICY_ACCEPTANCES_TABLE,
    'policyAcceptancesTable',
  );

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('legalAcceptanceLogs.title')}
        subtitle={t('legalAcceptanceLogs.subtitle')}
      />

      {/* Said out loud, because a table that opens on click looks exactly like
          one that does not until somebody tries it. */}
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {t('legalAcceptanceLogs.detail.openHint')}
      </Typography>

      <PolicyAcceptanceLogsTable
        fetchRows={fetchRows}
        formatDateTime={formatDateTime}
        onOpen={(row) => setOpenId(row.id)}
      />

      <AcceptanceDetailDialog acceptanceId={openId} onClose={() => setOpenId(null)} />
    </Stack>
  );
}
