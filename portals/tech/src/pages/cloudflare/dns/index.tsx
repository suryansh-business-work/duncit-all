import { Alert, AlertTitle, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { DuncitButton } from '@duncit/buttons';
import { StatCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { CloudflareMigration } from '@duncit/gql-types';
import CompareTable from './CompareTable';
import { copyableRows, useCloudflareRecords } from './useCloudflareRecords';

const GRID = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
} as const;

/** Before anything can be compared, the domain has to exist on Cloudflare. */
function ZoneMissing({ domain, busy, onAdd }: Readonly<{ domain: string; busy: boolean; onAdd: () => void }>) {
  const { t } = useTranslation();
  return (
    <Alert
      severity="info"
      data-testid="cloudflare-zone-missing"
      action={
        <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} loading={busy} onClick={onAdd} data-testid="cloudflare-add-zone">
          {t('tech.cloudflare.addZone')}
        </DuncitButton>
      }
    >
      <AlertTitle>{t('tech.cloudflare.zoneMissingTitle', { vars: { domain } })}</AlertTitle>
      {t('tech.cloudflare.zoneMissing')}
    </Alert>
  );
}

function CompareSummary({ migration }: Readonly<{ migration: CloudflareMigration }>) {
  const { t } = useTranslation();
  return (
    <>
      <Alert severity={migration.ready_to_switch ? 'success' : 'warning'} data-testid="cloudflare-parity-banner">
        {migration.ready_to_switch
          ? t('tech.cloudflare.bannerReady')
          : t('tech.cloudflare.bannerMissing', { count: migration.godaddy_only, vars: { count: String(migration.godaddy_only) } })}
      </Alert>
      <Box sx={GRID}>
        <StatCard label={t('tech.cloudflare.statMatched')} value={String(migration.matched)} hint={t('tech.cloudflare.statMatchedHint')} testId="cloudflare-matched" />
        <StatCard
          label={t('tech.cloudflare.statGodaddyOnly')}
          value={String(migration.godaddy_only)}
          valueColor={migration.godaddy_only > 0 ? 'error.main' : undefined}
          hint={t('tech.cloudflare.statGodaddyOnlyHint')}
          testId="cloudflare-godaddy-only"
        />
        <StatCard
          label={t('tech.cloudflare.statCloudflareOnly')}
          value={String(migration.cloudflare_only)}
          valueColor={migration.cloudflare_only > 0 ? 'warning.main' : undefined}
          hint={t('tech.cloudflare.statCloudflareOnlyHint')}
          testId="cloudflare-cloudflare-only"
        />
      </Box>
    </>
  );
}

/**
 * The DNS tab: GoDaddy's zone beside Cloudflare's, and the copy that makes
 * Cloudflare hold everything GoDaddy answers for before the switch.
 */
export default function CloudflareDnsTab({ migration }: Readonly<{ migration: CloudflareMigration }>) {
  const { t } = useTranslation();
  const actions = useCloudflareRecords();

  if (!migration.zone) return <ZoneMissing domain={migration.domain} busy={actions.busy} onAdd={actions.addZone} />;

  const copyable = copyableRows(migration.rows);
  return (
    <>
      <CompareSummary migration={migration} />
      <CompareTable
        rows={migration.rows}
        busy={actions.busy}
        onCopy={actions.copy}
        onDelete={actions.remove}
        toolbarActions={
          <DuncitButton
            size="small"
            variant="contained"
            startIcon={<ContentCopyIcon />}
            loading={actions.busy}
            disabled={copyable.length === 0}
            onClick={() => actions.copy(copyable)}
            data-testid="cloudflare-copy-all"
          >
            {t('tech.cloudflare.copyAll', { vars: { count: String(copyable.length) } })}
          </DuncitButton>
        }
      />
    </>
  );
}
