import {
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import SuiteResultsList from './SuiteResultsList';
import { durationLabel, testsLabel, type E2eRunRow } from './queries';

interface Props {
  run: E2eRunRow | null;
  onClose: () => void;
}

interface FactProps {
  label: string;
  value: string;
  mono?: boolean;
}

function Fact({ label, value, mono }: Readonly<FactProps>) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ wordBreak: 'break-word', fontFamily: mono ? 'monospace' : undefined }}
      >
        {value || '—'}
      </Typography>
    </Grid>
  );
}

/**
 * One run, in full: what each suite did, the identity it tested with, and where
 * the GitHub log is.
 *
 * The identity is here rather than only in the table because it is what makes a
 * failed signup investigable a week later — the address exists in the database
 * and nowhere else once the run log has expired.
 */
export default function RunDetailsDialog({ run, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!run) return null;

  const suiteScope =
    run.requested_suites.length === 0
      ? t('tech.e2e.everySuite')
      : run.requested_suites.join(', ');

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span>{run.run_no}</span>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('tech.e2e.detailSubtitle', {
              vars: { branch: run.ref || '—', tests: testsLabel(run) },
            })}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {run.error_message && <Alert severity="error">{run.error_message}</Alert>}

          <Grid container spacing={1.5}>
            <Fact label={t('tech.e2e.colBranch')} value={run.ref} />
            <Fact label={t('tech.e2e.colDuration')} value={durationLabel(run)} />
            <Fact label={t('tech.e2e.detailAsked')} value={suiteScope} />
            <Fact label={t('tech.e2e.colTriggeredBy')} value={run.triggered_by} />
            <Fact label={t('tech.e2e.detailCommit')} value={run.commit_sha.slice(0, 12)} mono />
            <Fact label={t('tech.e2e.colReportedBy')} value={run.reported_by} />
          </Grid>

          <Divider />
          <Typography variant="subtitle2">{t('tech.e2e.detailIdentity')}</Typography>
          <Grid container spacing={1.5}>
            <Fact label={t('tech.e2e.identityLogin')} value={run.login_email} mono />
            <Fact label={t('tech.e2e.identitySignup')} value={run.signup_email} mono />
            <Fact label={t('tech.e2e.identityPhone')} value={run.identity_phone} mono />
            <Fact label={t('tech.e2e.identityStamp')} value={run.identity_stamp} mono />
          </Grid>

          <Divider />
          <Typography variant="subtitle2">{t('tech.e2e.detailSuites')}</Typography>
          {/* Why there is nothing to watch, when there is nothing to watch. A
              suite row simply omits its link, so without this the absence of
              every recording in a run would have no explanation at all. */}
          {run.video_error && (
            <Alert severity="info" variant="outlined">
              {t('tech.e2e.videoError', { vars: { reason: run.video_error } })}
            </Alert>
          )}
          <SuiteResultsList results={run.results} />
        </Stack>
      </DialogContent>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', p: 2 }}>
        {run.workflow_run_url && (
          <Link
            href={run.workflow_run_url}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
          >
            <DuncitButton variant="outlined">{t('tech.e2e.viewRun')}</DuncitButton>
          </Link>
        )}
        <DuncitButton variant="contained" onClick={onClose}>
          {t('shell.common.close')}
        </DuncitButton>
      </Stack>
    </Dialog>
  );
}
