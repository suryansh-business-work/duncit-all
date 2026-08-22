import { Alert, Paper, Stack, Step, StepContent, StepLabel, Stepper, Typography } from '@mui/material';
import { grievanceEscalationCopy } from '@duncit/i18n';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Support first, grievance after — the ladder, as a timeline.
 *
 * The mWeb twin of the native `GrievanceEscalationNotice` and of the block the
 * website renders above its own form. All three read the SAME three steps and
 * the SAME warning from `grievanceEscalationCopy`, because this is the sentence
 * a rejected grievance is measured against: a complainant told one thing on the
 * website and another in the app has a fair argument that they were misled.
 *
 * Every step is rendered `active` and `completed={false}` — this is a policy,
 * not progress, so nothing here is ticked off as the person fills the form.
 */
export default function GrievanceEscalationNotice() {
  const { t } = useTranslation();
  const copy = grievanceEscalationCopy(t);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: '16px' }}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {copy.title}
        </Typography>
        <Stepper orientation="vertical" nonLinear activeStep={-1} sx={{ pl: 0.5 }}>
          {copy.steps.map((step) => (
            <Step key={step.key} active expanded completed={false}>
              <StepLabel>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {step.title}
                </Typography>
              </StepLabel>
              <StepContent>
                <Typography variant="caption" color="text.secondary">
                  {step.body}
                </Typography>
              </StepContent>
            </Step>
          ))}
        </Stepper>
        <Alert severity="warning">{copy.warning}</Alert>
      </Stack>
    </Paper>
  );
}
