import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { firstGraphQLError } from '@duncit/utils';
import { CMS_SITE_DNS, type CmsSiteDnsData } from '../queries/dns';
import ARecordDialog, { type ARecordTarget } from './ARecordDialog';
import DnsHost from './DnsHost';

/** The site's hostnames in the GoDaddy zone Tech → Domain manages, with A-record add / repoint. */
export default function DnsPanel({ siteId }: Readonly<{ siteId: string }>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<CmsSiteDnsData>(CMS_SITE_DNS, { variables: { siteId }, fetchPolicy: 'network-only' });
  const [target, setTarget] = useState<ARecordTarget | null>(null);
  const dns = data?.cmsSiteDns;
  const forbidden = firstGraphQLError(error)?.extensions?.code === 'FORBIDDEN';
  const reload = () => {
    // A failed refetch lands in `error`, which the panel already shows with Retry.
    refetch().catch(() => undefined);
  };

  return (
    <Paper variant="outlined" component="section" aria-labelledby="cms-dns-title" sx={{ p: { xs: 2, md: 3 } }} data-testid="cms-dns">
      <Stack spacing={2}>
        <Typography id="cms-dns-title" variant="h6" component="h2">
          {t('websiteApp.cms.dns.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('websiteApp.cms.dns.intro')}
        </Typography>
        {loading && <LinearProgress aria-label={t('websiteApp.cms.dns.loading')} />}
        {forbidden && <Alert severity="info">{t('websiteApp.cms.dns.forbidden')}</Alert>}
        {error && !forbidden && (
          <Alert severity="error" action={<DuncitButton size="small" onClick={reload}>{t('shell.common.retry')}</DuncitButton>}>
            {t('websiteApp.cms.dns.loadFailed')}
          </Alert>
        )}
        {dns && !dns.configured && <Alert severity="info">{t('websiteApp.cms.dns.notConfigured')}</Alert>}
        {dns?.configured && (
          <>
            <Typography variant="caption" color="text.secondary">
              {t('websiteApp.cms.dns.zone', { vars: { zone: dns.zone } })}
            </Typography>
            {dns.hosts.length === 0 && <Typography color="text.secondary">{t('websiteApp.cms.dns.noDomains')}</Typography>}
            {dns.hosts.map((entry) => (
              <DnsHost key={entry.host} entry={entry} onEdit={setTarget} />
            ))}
          </>
        )}
      </Stack>
      <ARecordDialog siteId={siteId} target={target} onClose={() => setTarget(null)} onSaved={reload} />
    </Paper>
  );
}
