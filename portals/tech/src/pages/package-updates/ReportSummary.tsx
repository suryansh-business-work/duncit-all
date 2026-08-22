import { Chip, Stack, Typography } from '@mui/material';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import type { PackageUpdatesReport } from './queries';

/**
 * The one-line state of the whole repo: how much is declared, how much of it
 * the registry was asked about, and how far behind the answer says it is.
 *
 * The provenance line underneath is not decoration — a number about "the
 * latest version" is only worth reading beside WHEN it was fetched and from
 * WHICH registry, and a self-hosted mirror is a supported configuration.
 */
export default function ReportSummary({ report }: Readonly<{ report: PackageUpdatesReport }>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip variant="outlined" label={`${t('tech.packageUpdates.manifests')}: ${report.totalPackages}`} />
        <Chip
          variant="outlined"
          label={`${t('tech.packageUpdates.declaredCount')}: ${report.totalDependencies}`}
        />
        <Chip
          variant="outlined"
          label={`${t('tech.packageUpdates.trackedOnNpm')}: ${report.uniqueDependencies}`}
        />
        <Chip
          color={report.outdated > 0 ? 'primary' : 'success'}
          label={`${t('tech.packageUpdates.outdated')}: ${report.outdated}`}
        />
        <Chip color="error" variant="outlined" label={`${t('tech.packageUpdates.major')}: ${report.major}`} />
        <Chip color="warning" variant="outlined" label={`${t('tech.packageUpdates.minor')}: ${report.minor}`} />
        <Chip color="info" variant="outlined" label={`${t('tech.packageUpdates.patch')}: ${report.patch}`} />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {report.checkedAt
          ? `${t('tech.packageUpdates.lastChecked')}: ${formatDateTime(report.checkedAt)}`
          : t('tech.packageUpdates.neverChecked')}
        {' · '}
        {report.registry}
      </Typography>
    </Stack>
  );
}
