import { Alert, Chip, Stack, Switch, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { CloudflareMigration, NameServerTarget } from '@duncit/gql-types';

interface Props {
  migration: CloudflareMigration;
  busy: boolean;
  onSwitch: (target: NameServerTarget, servers: string[]) => void;
  onRecheck: () => void;
}

/** Why a side of the switch cannot be chosen right now, or null when it can. */
function blockedReason(migration: Readonly<CloudflareMigration>, toCloudflare: boolean, t: ReturnType<typeof useTranslation>['t']) {
  if (toCloudflare && !migration.zone) return t('tech.cloudflare.blockedNoZone');
  if (toCloudflare && !migration.ready_to_switch) {
    return t('tech.cloudflare.blockedMissing', { count: migration.godaddy_only, vars: { count: String(migration.godaddy_only) } });
  }
  if (!toCloudflare && migration.godaddy_name_servers.length === 0) return t('tech.cloudflare.blockedNoGodaddy');
  return null;
}

/**
 * GoDaddy on one side, Cloudflare on the other: the switch reads which one the
 * registrar points at today, and flipping it moves the nameservers. Moving to
 * Cloudflare is held back until every GoDaddy record is already there.
 */
export default function ProviderSwitch({ migration, busy, onSwitch, onRecheck }: Readonly<Props>) {
  const { t } = useTranslation();
  const onCloudflare = migration.live_provider === 'CLOUDFLARE';
  const blocked = blockedReason(migration, !onCloudflare, t);
  const zone = migration.zone;

  const flip = () => {
    if (onCloudflare) onSwitch('GODADDY', migration.godaddy_name_servers);
    else onSwitch('CLOUDFLARE', zone?.name_servers ?? []);
  };

  return (
    <SectionCard
      title={t('tech.cloudflare.liveTitle')}
      subtitle={t('tech.cloudflare.liveSubtitle')}
      action={
        zone && (
          <Chip
            size="small"
            color={zone.status === 'active' ? 'success' : 'warning'}
            label={t('tech.cloudflare.zoneStatus', { vars: { status: zone.status } })}
            data-testid="cloudflare-zone-status"
          />
        )
      }
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: onCloudflare ? 'fontWeightRegular' : 'fontWeightBold' }}>
            {t('tech.cloudflare.providerGodaddy')}
          </Typography>
          <Switch
            checked={onCloudflare}
            onChange={flip}
            disabled={busy || blocked !== null}
            slotProps={{ input: { 'aria-label': t('tech.cloudflare.switchLabel') } }}
            data-testid="cloudflare-provider-switch"
          />
          <Typography variant="subtitle2" sx={{ fontWeight: onCloudflare ? 'fontWeightBold' : 'fontWeightRegular' }}>
            {t('tech.cloudflare.providerCloudflare')}
          </Typography>
        </Stack>
        {(migration.live_provider === 'OTHER' || migration.live_provider === 'UNKNOWN') && (
          <Alert severity="warning" data-testid="cloudflare-provider-other">
            {t('tech.cloudflare.providerOther')}
          </Alert>
        )}
        {blocked && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="cloudflare-switch-blocked">
            {blocked}
          </Typography>
        )}
        {zone && zone.status !== 'active' && onCloudflare && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('tech.cloudflare.pendingActivation')}
            </Typography>
            <DuncitButton size="small" startIcon={<RefreshIcon />} loading={busy} onClick={onRecheck} data-testid="cloudflare-recheck">
              {t('tech.cloudflare.recheck')}
            </DuncitButton>
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
}
