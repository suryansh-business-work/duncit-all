import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from '@duncit/shell';
import { changesLabel, downloadUrl, durationLabel, type AppBuildRow } from './queries';

interface Props {
  build: AppBuildRow | null;
  onClose: () => void;
}

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

/** Everything one build carries — most usefully, every commit it shipped. */
export default function BuildDetailsDialog({ build, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!build) return null;
  const slackValue = (() => {
    if (build.slack_ts) return `${t('tech.appBuilds.slackPosted')} · ${build.slack_channel ?? ''}`;
    return build.slack_error ?? t('tech.appBuilds.slackSkipped');
  })();

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <span>{build.build_no}</span>
          <Chip
            size="small"
            label={
              build.status === 'SUCCESS'
                ? t('tech.appBuilds.statusSuccess')
                : t('tech.appBuilds.statusFailed')
            }
            color={build.status === 'SUCCESS' ? 'success' : 'error'}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {build.build_name}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <Fact label={t('tech.appBuilds.colVersion')} value={build.version} />
          <Fact
            label={t('tech.appBuilds.colWhen')}
            value={build.created_at ? new Date(build.created_at).toLocaleString() : '—'}
          />
          <Fact
            label={t('tech.appBuilds.colSize')}
            value={build.size_mb == null ? '—' : `${build.size_mb.toFixed(1)} MB`}
          />
          <Fact label={t('tech.appBuilds.colDuration')} value={durationLabel(build)} />
          <Fact label={t('tech.appBuilds.colBranch')} value={build.branch || '—'} />
          <Fact label={t('tech.appBuilds.colCommit')} value={build.commit_sha || '—'} />
          <Fact label={t('tech.appBuilds.colChanges')} value={changesLabel(build)} />
          <Fact label={t('tech.appBuilds.colReportedBy')} value={build.reported_by || '—'} />
          <Fact label={t('tech.appBuilds.colSlack')} value={slackValue} />
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {t('tech.appBuilds.commitsTitle', { vars: { total: String(build.commits.length) } })}
        </Typography>
        {build.commits.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t('tech.appBuilds.noCommits')}
          </Typography>
        )}
        <Stack spacing={0.75}>
          {build.commits.map((c) => (
            <Stack key={c.hash} direction="row" spacing={1} alignItems="baseline">
              <Typography variant="caption" sx={{ fontFamily: 'monospace' }} color="text.secondary">
                {c.hash.slice(0, 7)}
              </Typography>
              <Typography variant="body2">{c.subject}</Typography>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        {build.workflow_run_url && (
          <Button
            component="a"
            href={build.workflow_run_url}
            target="_blank"
            rel="noreferrer"
            startIcon={<OpenInNewIcon />}
          >
            {t('tech.appBuilds.viewRun')}
          </Button>
        )}
        {build.artifact_url && (
          <Button
            component="a"
            href={downloadUrl(build)}
            variant="contained"
            startIcon={<DownloadIcon />}
          >
            {t('tech.appBuilds.download')}
          </Button>
        )}
        <Button onClick={onClose}>{t('tech.appBuilds.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
