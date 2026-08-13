import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { changesLabel, durationLabel, sizeLabel, type AppBuildRow } from './queries';

const Fact = ({ label, value }: Readonly<{ label: string; value: string }>) => (
  <Stack direction="row" spacing={1} justifyContent="space-between">
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ textAlign: 'right', wordBreak: 'break-all' }}>
      {value}
    </Typography>
  </Stack>
);

/** Everything one build carries as plain label/value pairs. */
export default function BuildFacts({ build }: Readonly<{ build: AppBuildRow }>) {
  const { t } = useTranslation();

  const slackValue = build.slack_ts
    ? `${t('tech.appBuilds.slackPosted')} · ${build.slack_channel ?? ''}`
    : (build.slack_error ?? t('tech.appBuilds.slackSkipped'));

  const envValue =
    build.app_env === 'STAGING' ? t('tech.appBuilds.envStaging') : t('tech.appBuilds.envProduction');

  const triggerValue = build.trigger_source === 'PORTAL'
    ? t('tech.appBuilds.triggerPortal')
    : t('tech.appBuilds.triggerPush');

  // Only interesting when it differs from what was produced — on a build that
  // made everything it was asked for, the artifacts list already says it.
  const requested = build.requested_artifacts ?? [];

  return (
    <Stack spacing={1}>
      <Fact label={t('tech.appBuilds.colVersion')} value={build.version || '—'} />
      <Fact
        label={t('tech.appBuilds.colWhen')}
        value={build.created_at ? new Date(build.created_at).toLocaleString() : '—'}
      />
      <Fact label={t('tech.appBuilds.colEnv')} value={envValue} />
      <Fact
        label={t('tech.appBuilds.colTriggeredBy')}
        value={build.triggered_by ? `${build.triggered_by} · ${triggerValue}` : triggerValue}
      />
      {requested.length > 0 && (
        <Fact label={t('tech.appBuilds.colRequested')} value={requested.join(', ')} />
      )}
      <Fact label={t('tech.appBuilds.colSize')} value={sizeLabel(build)} />
      <Fact label={t('tech.appBuilds.colDuration')} value={durationLabel(build)} />
      <Fact label={t('tech.appBuilds.colBranch')} value={build.branch || '—'} />
      <Fact label={t('tech.appBuilds.colCommit')} value={build.commit_sha || '—'} />
      <Fact label={t('tech.appBuilds.colChanges')} value={changesLabel(build)} />
      <Fact label={t('tech.appBuilds.colReportedBy')} value={build.reported_by || '—'} />
      <Fact label={t('tech.appBuilds.colSlack')} value={slackValue} />
    </Stack>
  );
}
