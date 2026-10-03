import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, AlertTitle, Link, Stack } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { CloudflareMigration } from '@duncit/gql-types';
import { CLOUDFLARE_MIGRATION } from './queries';
import CloudflareDnsTab from './dns';
import CloudflareNameServersTab from './name-servers';

const TAB_PREFIX = 'cloudflare';
type Tab = 'dns' | 'name-servers';

/**
 * A key is missing, or the two keys name different domains. Comparing zones
 * then means nothing, so the page says what to fix rather than showing an
 * empty table that looks like a zone with nothing in it.
 */
function NotConnected({ migration }: Readonly<{ migration: CloudflareMigration }>) {
  const { t } = useTranslation();
  let message = t('tech.cloudflare.notConfigured');
  if (migration.godaddy_configured && migration.cloudflare_configured) {
    message = t('tech.cloudflare.domainMismatch', {
      vars: { godaddy: migration.domain, cloudflare: migration.cloudflare_domain },
    });
  } else if (!migration.godaddy_configured) {
    message = t('tech.cloudflare.godaddyMissing');
  }
  return (
    <Alert severity="info" data-testid="cloudflare-not-connected">
      <AlertTitle>{t('tech.cloudflare.notConfiguredTitle')}</AlertTitle>
      {message}{' '}
      <Link component={RouterLink} to="/" data-testid="cloudflare-open-environment">
        {t('shell.nav.environmentVariables')}
      </Link>
    </Alert>
  );
}

function Migration({ migration }: Readonly<{ migration: CloudflareMigration }>) {
  const { t } = useTranslation();
  const items = useMemo<DuncitTabItem<Tab>[]>(
    () => [
      { value: 'dns', label: t('tech.cloudflare.tabDns'), icon: <DnsIcon />, iconPosition: 'start', testId: 'cloudflare-tab-dns' },
      {
        value: 'name-servers',
        label: t('tech.cloudflare.tabNameServers'),
        icon: <SwapHorizIcon />,
        iconPosition: 'start',
        testId: 'cloudflare-tab-name-servers',
      },
    ],
    [t],
  );
  const tabs = useTabParam<Tab>({ items, fallback: 'dns' });

  return (
    <>
      <DuncitTabs {...tabs} idPrefix={TAB_PREFIX} aria-label={t('tech.cloudflare.tabsLabel')} />
      <Stack {...tabPanelProps(TAB_PREFIX, tabs.value)} spacing={2}>
        {tabs.value === 'dns' ? <CloudflareDnsTab migration={migration} /> : <CloudflareNameServersTab migration={migration} />}
      </Stack>
    </>
  );
}

/**
 * Tech → Security → Cloudflare: GoDaddy's zone beside Cloudflare's, the copy
 * that makes them match, and the switch that moves the nameservers.
 */
export default function CloudflarePage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(CLOUDFLARE_MIGRATION, { fetchPolicy: 'cache-and-network' });
  const migration = data?.cloudflareMigration;
  const subtitle = migration?.connected ? t('tech.cloudflare.subtitle', { vars: { domain: migration.domain } }) : undefined;

  return (
    <Stack spacing={3} data-testid="cloudflare-page">
      <PageHeader title={t('shell.nav.cloudflare')} subtitle={subtitle} />
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {migration && (migration.connected ? <Migration migration={migration} /> : <NotConnected migration={migration} />)}
      </QueryGuard>
    </Stack>
  );
}
