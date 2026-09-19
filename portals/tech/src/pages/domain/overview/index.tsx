import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { DnsDomainInfo } from '@duncit/gql-types';
import NotConfigured from '../NotConfigured';
import { DNS_DOMAIN_INFO } from '../queries';
import DomainFacts from './DomainFacts';
import DomainProtections from './DomainProtections';
import DomainParties from './DomainParties';
import { expiryLevel, renewWarning } from './expiry';

/** The one line worth interrupting the page for: the registration is nearly out. */
function ExpiryBanner({ info }: Readonly<{ info: DnsDomainInfo }>) {
  const { t } = useTranslation();
  const level = expiryLevel(info.days_to_expiry);
  const days = info.days_to_expiry ?? 0;

  if (level === 'EXPIRED') {
    return (
      <Alert severity="error" data-testid="domain-expiry-banner">
        {t('tech.domain.bannerExpired', { vars: { domain: info.domain, days: String(-days) } })}
      </Alert>
    );
  }
  if (level === 'CRITICAL' || level === 'SOON') {
    return (
      <Alert severity={level === 'CRITICAL' ? 'error' : 'warning'} data-testid="domain-expiry-banner">
        {t('tech.domain.bannerExpiring', { vars: { domain: info.domain, days: String(days) } })}
      </Alert>
    );
  }
  if (renewWarning(info)) {
    return (
      <Alert severity="warning" data-testid="domain-expiry-banner">
        {t('tech.domain.bannerNoAutoRenew')}
      </Alert>
    );
  }
  return null;
}

function DomainBody({ info }: Readonly<{ info: DnsDomainInfo }>) {
  return (
    <Stack spacing={3}>
      <ExpiryBanner info={info} />
      <DomainFacts info={info} />
      <DomainProtections info={info} />
      <DomainParties contacts={info.contacts} nameServers={info.name_servers} />
    </Stack>
  );
}

/** Tech → Domain → Overview: the domain itself at GoDaddy, not the records under it. */
export default function DomainOverviewPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(DNS_DOMAIN_INFO, { fetchPolicy: 'cache-and-network' });
  const info = data?.dnsDomainInfo;
  const subtitle = info?.configured
    ? t('tech.domain.subtitle', { vars: { domain: info.domain } })
    : undefined;

  return (
    <Stack spacing={3} data-testid="domain-overview-page">
      <PageHeader title={t('tech.domain.pageTitle')} subtitle={subtitle} />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {info && (info.configured ? <DomainBody info={info} /> : <NotConfigured />)}
      </QueryGuard>
    </Stack>
  );
}
