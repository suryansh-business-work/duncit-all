import { useQuery } from '@apollo/client/react';
import { Link as RouterLink } from 'react-router';
import { Alert, AlertTitle, Link, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { DnsZone } from '@duncit/gql-types';
import DnsRecordsTable from './DnsRecordsTable';
import DnsRecordDialog from './DnsRecordDialog';
import { useDnsRecordActions } from './useDnsRecordActions';
import { DNS_ZONE } from './queries';

/** No GoDaddy key yet: say where it goes rather than showing an empty zone. */
function NotConfigured() {
  const { t } = useTranslation();
  return (
    <Alert severity="info" data-testid="dns-not-configured">
      <AlertTitle>{t('tech.dns.notConfiguredTitle')}</AlertTitle>
      {t('tech.dns.notConfigured')}{' '}
      <Link component={RouterLink} to="/" data-testid="dns-open-environment">
        {t('shell.nav.environmentVariables')}
      </Link>
    </Alert>
  );
}

function ZoneRecords({ zone }: Readonly<{ zone: DnsZone }>) {
  const { t } = useTranslation();
  const actions = useDnsRecordActions(zone.domain);
  return (
    <>
      <DnsRecordsTable
        records={zone.records}
        domain={zone.domain}
        onEdit={actions.openEdit}
        onDelete={actions.remove}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={actions.openCreate}
            data-testid="dns-add-record"
          >
            {t('tech.dns.addRecord')}
          </DuncitButton>
        }
      />
      <DnsRecordDialog
        open={actions.dialogOpen}
        zone={zone}
        editing={actions.editing}
        saving={actions.saving}
        opError={actions.opError}
        onClose={actions.close}
        onSubmit={actions.submit}
      />
    </>
  );
}

/** Tech → DNS Config → DNS Records: the GoDaddy zone behind every *.duncit.com host. */
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
