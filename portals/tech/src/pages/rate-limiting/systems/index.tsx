import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import StatsStrip from '../StatsStrip';
import SystemsTable from './SystemsTable';
import { SYSTEMS, type RateLimitSystemRow } from '../queries';

/**
 * Which systems call this API, and what each of them spends.
 *
 * The list is written by the traffic itself: a portal, an app or a website
 * appears here the first time it makes a request, so nothing has to be
 * registered by hand and nothing can be silently missing.
 */
export default function RateLimitSystemsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ rateLimitSystems: RateLimitSystemRow[] }>(SYSTEMS, {
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.rateLimitSystems ?? [];
  const ungoverned = rows.filter((row) => row.rule_count === 0).length;

  return (
    <Stack spacing={3}>
      <PageHeader
        title={t('shell.nav.systems')}
        subtitle={t('tech.rateLimit.systems.subtitle')}
      />
      <StatsStrip />
      {ungoverned > 0 && (
        <Alert severity="info" variant="outlined">
          {t('tech.rateLimit.systems.ungovernedNotice', { vars: { count: String(ungoverned) } })}
        </Alert>
      )}
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        <SystemsTable rows={rows} />
      </QueryGuard>
    </Stack>
  );
}
