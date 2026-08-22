import { useState } from 'react';
import { Alert, Box, Button, Collapse, Paper, Stack, Typography } from '@mui/material';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useTranslation } from '../../i18n';
import type { ServiceGroup } from '../../types';
import ReportIssueForm from './report-issue.form';

type Phase = 'closed' | 'editing' | 'sent';

/**
 * "Report a problem" on the public status page.
 *
 * The probes above answer one question — is the host returning an HTTP status —
 * and most of what actually goes wrong is invisible to that. This is the other
 * half of the page: the reports land in the Tech portal beside the telemetry
 * the machines write, so a broken sign-in is visible there before enough
 * people give up to bend a graph.
 */
export default function ReportIssueSection({
  groups,
}: Readonly<{ groups: ServiceGroup[] | null }>) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('closed');
  // Hoisted out of the JSX so the branch sits at nesting 0 (SonarQube S3776).
  const openLabel =
    phase === 'sent' ? t('status.report.sendAnother') : t('status.report.open');

  return (
    <Box component="section" mb={4}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: '0.12em', fontWeight: 700 }}
      >
        {t('status.report.heading')}
      </Typography>
      <Paper variant="outlined" sx={{ mt: 0.5, p: 2.5 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t('status.report.intro')}
          </Typography>

          {phase === 'sent' && (
            <Alert severity="success" onClose={() => setPhase('closed')}>
              <Typography fontWeight={700}>{t('status.report.successTitle')}</Typography>
              <Typography variant="body2">{t('status.report.successBody')}</Typography>
            </Alert>
          )}

          {phase !== 'editing' && (
            <Box>
              <Button
                variant="outlined"
                startIcon={<ReportProblemOutlinedIcon />}
                onClick={() => setPhase('editing')}
              >
                {openLabel}
              </Button>
            </Box>
          )}

          <Collapse in={phase === 'editing'} unmountOnExit>
            <ReportIssueForm
              groups={groups}
              onSubmitted={() => setPhase('sent')}
              onCancel={() => setPhase('closed')}
            />
          </Collapse>
        </Stack>
      </Paper>
    </Box>
  );
}
