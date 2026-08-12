import {
  Alert,
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
import {
  changesLabel,
  durationLabel,
  sizeLabel,
  type AppBuildArtifact,
  type AppBuildRow,
} from './queries';

interface Props {
  build: AppBuildRow | null;
  onClose: () => void;
}

const STATUS_KEY = {
  RUNNING: 'tech.appBuilds.statusRunning',
  SUCCESS: 'tech.appBuilds.statusSuccess',
  FAILED: 'tech.appBuilds.statusFailed',
} as const;

const STATUS_COLOR = {
  RUNNING: 'info',
  SUCCESS: 'success',
  FAILED: 'error',
} as const;

/**
 * One produced file, with its own download. An Android build lists two: the APK
 * to sideload and the AAB that goes to Play. One that never stored shows the
 * reason instead of a dead button.
 */
const ArtifactRow = ({
  artifact,
  missingLabel,
}: Readonly<{ artifact: AppBuildArtifact; missingLabel: string }>) => (
  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
    <Stack sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap title={artifact.name}>
        {artifact.name}
      </Typography>
      <Typography variant="caption" color={artifact.url ? 'text.secondary' : 'warning.main'}>
        {artifact.url ? artifact.kind : artifact.error || missingLabel}
      </Typography>
    </Stack>
    {artifact.url && (
      <Button
        size="small"
        component="a"
        href={artifact.url}
        variant="outlined"
        startIcon={<DownloadIcon />}
      >
        {artifact.kind}
      </Button>
    )}
  </Stack>
);

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
          <Chip size="small" label={t(STATUS_KEY[build.status])} color={STATUS_COLOR[build.status]} />
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
          <Fact label={t('tech.appBuilds.colSize')} value={sizeLabel(build)} />
          <Fact label={t('tech.appBuilds.colDuration')} value={durationLabel(build)} />
          <Fact label={t('tech.appBuilds.colBranch')} value={build.branch || '—'} />
          <Fact label={t('tech.appBuilds.colCommit')} value={build.commit_sha || '—'} />
          <Fact label={t('tech.appBuilds.colChanges')} value={changesLabel(build)} />
          <Fact label={t('tech.appBuilds.colReportedBy')} value={build.reported_by || '—'} />
          <Fact label={t('tech.appBuilds.colSlack')} value={slackValue} />
        </Stack>
        {build.status === 'FAILED' && build.error_message && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {build.error_message}
          </Alert>
        )}
        {build.artifacts.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('tech.appBuilds.artifactsTitle')}
            </Typography>
            <Stack spacing={0.75}>
              {build.artifacts.map((a) => (
                <ArtifactRow key={a.kind} artifact={a} missingLabel={t('tech.appBuilds.noArtifact')} />
              ))}
            </Stack>
          </>
        )}
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
        <Button onClick={onClose}>{t('tech.appBuilds.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
