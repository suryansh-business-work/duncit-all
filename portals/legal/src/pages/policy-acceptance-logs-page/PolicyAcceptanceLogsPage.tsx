import { useApolloClient } from '@apollo/client';
import { Stack } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { PageHeader } from '@duncit/ui';
import { POLICY_ACCEPTANCES_TABLE, type PolicyAcceptance } from '../../graphql/policyAcceptance';
import PolicyAcceptanceLogsTable from './PolicyAcceptanceLogsTable';

/**
 * Legal > Policy Acceptance Logs — the append-only record of who accepted which
 * policy, and when.
 */
export default function PolicyAcceptanceLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  // Admin-configured format and time zone, so an acceptance timestamp quoted
  // from here matches the one quoted from anywhere else in the platform.
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });

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

      <PolicyAcceptanceLogsTable fetchRows={fetchRows} formatDateTime={formatDateTime} />
    </Stack>
  );
}
