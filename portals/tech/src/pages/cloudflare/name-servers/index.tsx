import { Box, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { CloudflareMigration } from '@duncit/gql-types';
import NameServerList from './NameServerList';
import ProviderSwitch from './ProviderSwitch';
import { CustomNameServersFormBody } from './custom-name-servers';
import { useNameServers } from './useNameServers';

const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
} as const;

/**
 * The Nameservers tab: which provider answers for the domain today, the
 * GoDaddy ⇄ Cloudflare switch, the three sets of nameservers it moves between,
 * and a form for any other set.
 */
export default function CloudflareNameServersTab({ migration }: Readonly<{ migration: CloudflareMigration }>) {
  const { t } = useTranslation();
  const nameServers = useNameServers(migration.domain);

  return (
    <Stack spacing={3}>
      <ProviderSwitch
        migration={migration}
        busy={nameServers.busy}
        onSwitch={(target, servers) => nameServers.apply(target, servers)}
        onRecheck={nameServers.recheck}
      />
      <Box sx={GRID}>
        <NameServerList
          title={t('tech.cloudflare.currentTitle')}
          subtitle={t('tech.cloudflare.currentSubtitle')}
          servers={migration.current_name_servers}
          emptyText={t('tech.cloudflare.noneReported')}
          testId="cloudflare-ns-current"
        />
        <NameServerList
          title={t('tech.cloudflare.assignedTitle')}
          subtitle={t('tech.cloudflare.assignedSubtitle')}
          servers={migration.zone?.name_servers ?? []}
          emptyText={t('tech.cloudflare.assignedEmpty')}
          testId="cloudflare-ns-assigned"
        />
        <NameServerList
          title={t('tech.cloudflare.godaddyTitle')}
          subtitle={t('tech.cloudflare.godaddySubtitle')}
          servers={migration.godaddy_name_servers}
          emptyText={t('tech.cloudflare.noneReported')}
          testId="cloudflare-ns-godaddy"
        />
      </Box>
      <CustomNameServersFormBody busy={nameServers.busy} onSubmit={(servers) => nameServers.apply('CUSTOM', servers)} />
    </Stack>
  );
}
