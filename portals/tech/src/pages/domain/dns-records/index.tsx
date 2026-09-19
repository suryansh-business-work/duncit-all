import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { DnsZone } from '@duncit/gql-types';
import NotConfigured from '../NotConfigured';
import { DNS_ZONE } from '../queries';
import DnsRecordsTable from './DnsRecordsTable';
import DnsRecordDialog from './DnsRecordDialog';
import { useDnsRecordActions } from './useDnsRecordActions';
import { ALL_TYPES, recordTypeTabs, recordsOfType } from './recordTypeTabs';

const TAB_PREFIX = 'dns-records';

function ZoneRecords({ zone }: Readonly<{ zone: DnsZone }>) {
  const { t } = useTranslation();
  const actions = useDnsRecordActions(zone.domain);
  const items = useMemo(() => recordTypeTabs(zone.by_type, t('tech.dns.allTypes')), [zone.by_type, t]);
  const tabs = useTabParam({ items, fallback: ALL_TYPES });
  const records = useMemo(() => recordsOfType(zone.records, tabs.value), [zone.records, tabs.value]);
  // Adding from a type's tab opens the form on that type. The "All" tab names
  // none, and a read-only type (NS, SOA) is refused by the form's own list.
  const seedType = tabs.value === ALL_TYPES ? null : tabs.value;

  return (
    <>
      <DuncitTabs
        {...tabs}
        idPrefix={TAB_PREFIX}
        variant="scrollable"
        scrollButtons="auto"
        aria-label={t('tech.dns.typeTabsLabel')}
      />
      <Stack {...tabPanelProps(TAB_PREFIX, tabs.value)} spacing={2}>
        <DnsRecordsTable
          records={records}
          domain={zone.domain}
          onEdit={actions.openEdit}
          onDelete={actions.remove}
          toolbarActions={
            <DuncitButton
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => actions.openCreate(seedType)}
              data-testid="dns-add-record"
            >
              {t('tech.dns.addRecord')}
            </DuncitButton>
          }
        />
      </Stack>
      <DnsRecordDialog
        open={actions.dialogOpen}
        zone={zone}
        editing={actions.editing}
        seedType={actions.seedType}
        saving={actions.saving}
        opError={actions.opError}
        onClose={actions.close}
        onSubmit={actions.submit}
      />
    </>
  );
}

/** Tech → Domain → DNS Records: the GoDaddy zone behind every *.duncit.com host. */
export default function DnsRecordsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(DNS_ZONE, { fetchPolicy: 'cache-and-network' });
  const zone = data?.dnsZone;
  const subtitle = zone?.configured ? t('tech.dns.subtitle', { vars: { domain: zone.domain } }) : undefined;

  return (
    <Stack spacing={3} data-testid="dns-records-page">
      <PageHeader title={t('shell.nav.dnsRecords')} subtitle={subtitle} />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {zone && (zone.configured ? <ZoneRecords zone={zone} /> : <NotConfigured />)}
      </QueryGuard>
    </Stack>
  );
}
