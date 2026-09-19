import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { DnsZone } from '@duncit/gql-types';
import NotConfigured from '../NotConfigured';
import { DNS_ZONE } from '../queries';
import StagingSummary from './StagingSummary';
import StagingPairsTable from './StagingPairsTable';
import TypeCountsCard from './TypeCountsCard';
import { fixablePairs, useStagingSync } from './useStagingSync';

function StagingCompare({ zone }: Readonly<{ zone: DnsZone }>) {
  const { t } = useTranslation();
  const sync = useStagingSync();
  const fixable = fixablePairs(zone.staging.pairs);

  return (
    <>
      <StagingSummary compare={zone.staging} />
      <TypeCountsCard byType={zone.by_type} pairedTypes={zone.staging.paired_types} />
      <StagingPairsTable
        pairs={zone.staging.pairs}
        syncing={sync.syncing}
        onSync={sync.run}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<SyncAltIcon />}
            loading={sync.syncing}
            disabled={fixable.length === 0}
            onClick={() => sync.run(fixable)}
            data-testid="dns-staging-sync-all"
          >
            {t('tech.dnsStaging.syncAll', { vars: { count: String(fixable.length) } })}
          </DuncitButton>
        }
      />
    </>
  );
}

/**
 * Tech → Domain → Staging Sync: the staging replica beside production, host by
 * host, and the one button that makes staging match.
 */
export default function DnsStagingPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(DNS_ZONE, { fetchPolicy: 'cache-and-network' });
  const zone = data?.dnsZone;
  const subtitle = zone?.configured ? t('tech.dnsStaging.subtitle', { vars: { domain: zone.domain } }) : undefined;

  return (
    <Stack spacing={3} data-testid="dns-staging-page">
      <PageHeader title={t('shell.nav.dnsStagingSync')} subtitle={subtitle} />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {zone && (zone.configured ? <StagingCompare zone={zone} /> : <NotConfigured />)}
      </QueryGuard>
    </Stack>
  );
}
