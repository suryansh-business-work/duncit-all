import { Alert, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import BuildFacts from './BuildFacts';
import BuildProgress from './BuildProgress';
import { type AppBuildArtifact, type AppBuildRow } from './queries';

interface Props {
  build: AppBuildRow | null;
  onClose: () => void;
}

const STATUS_KEY = {
  QUEUED: 'tech.appBuilds.statusQueued',
  RUNNING: 'tech.appBuilds.statusRunning',
  SUCCESS: 'tech.appBuilds.statusSuccess',
  FAILED: 'tech.appBuilds.statusFailed',
} as const;

const STATUS_COLOR = {
  QUEUED: 'default',
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
  <Stack
    direction="row"
    spacing={1}
    sx={{
      alignItems: "center",
      justifyContent: "space-between"
    }}>
    <Stack sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap title={artifact.name}>
        {artifact.name}
      </Typography>
      <Typography variant="caption" color={artifact.url ? 'text.secondary' : 'warning.main'}>
        {artifact.url ? artifact.kind : artifact.error || missingLabel}
      </Typography>
    </Stack>
    {artifact.url && (
      <DuncitButton
        size="small"
        component="a"
        href={artifact.url}
        variant="outlined"
        startIcon={<DownloadIcon />}
      >
        {artifact.kind}
      </DuncitButton>
    )}
  </Stack>
);

/** Everything one build carries — most usefully, every commit it shipped. */
export default function BuildDetailsDialog({ build, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!build) return null;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} sx={{
          alignItems: "center"
        }}>
          <span>{build.build_no}</span>
          <Chip size="small" label={t(STATUS_KEY[build.status])} color={STATUS_COLOR[build.status]} />
        </Stack>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {build.build_name}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <BuildFacts build={build} />
        {build.status === 'FAILED' && build.error_message && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {build.error_message}
          </Alert>
        )}
        {build.stages.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <BuildProgress build={build} />
          </>
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
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {t('tech.appBuilds.noCommits')}
          </Typography>
        )}
        <Stack spacing={0.75}>
          {build.commits.map((c) => (
            <Stack key={c.hash} direction="row" spacing={1} sx={{
              alignItems: "baseline"
            }}>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontFamily: 'monospace'
                }}>
                {c.hash.slice(0, 7)}
              </Typography>
              <Typography variant="body2">{c.subject}</Typography>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        {/* A dispatch answers before a run exists, so a just-queued build has no
            run to link to yet. Saying so beats an absent button that looks like
            a bug. */}
        {!build.workflow_run_url && build.status === 'QUEUED' && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              mr: 'auto',
              pl: 2
            }}>
            {t('tech.appBuilds.runLinkPending')}
          </Typography>
        )}
        {build.workflow_run_url && (
          <DuncitButton
            component="a"
            href={build.workflow_run_url}
            target="_blank"
            rel="noreferrer"
            startIcon={<OpenInNewIcon />}
          >
            {t('tech.appBuilds.viewRun')}
          </DuncitButton>
        )}
        <DuncitButton onClick={onClose}>{t('tech.appBuilds.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
