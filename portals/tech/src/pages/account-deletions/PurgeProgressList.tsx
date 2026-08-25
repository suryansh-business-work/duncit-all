import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { useTranslation } from '@duncit/app-settings';
import type { PurgeStep } from './useDeletionDetail';

const ICON_SIZE = 18;

/** The state marker for one line. A spinner beats a static icon while a step is
 * in flight — it is the only thing on screen saying the run has not hung. */
function StepIcon({ status }: Readonly<{ status: PurgeStep['status'] }>) {
  if (status === 'RUNNING') return <CircularProgress size={ICON_SIZE} />;
  if (status === 'DONE') {
    return <CheckCircleIcon color="success" sx={{ fontSize: ICON_SIZE }} />;
  }
  if (status === 'FAILED') {
    return <ErrorOutlineIcon color="error" sx={{ fontSize: ICON_SIZE }} />;
  }
  return <RadioButtonUncheckedIcon color="disabled" sx={{ fontSize: ICON_SIZE }} />;
}

function StepRow({ step }: Readonly<{ step: PurgeStep }>) {
  const { t } = useTranslation();
  const done = step.status === 'DONE';
  const countKey = step.redacts
    ? 'tech.accountDeletions.stepRedacted'
    : 'tech.accountDeletions.stepRemoved';

  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', py: 0.4 }}>
      <Box sx={{ display: 'flex', width: ICON_SIZE, justifyContent: 'center' }}>
        <StepIcon status={step.status} />
      </Box>
      <Typography variant="body2" noWrap sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
        {step.collection}
        {step.field && (
          <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.75 }}>
            {step.field}
          </Typography>
        )}
      </Typography>
      {step.redacts && <ShieldOutlinedIcon color="info" sx={{ fontSize: 15 }} />}
      <Typography
        variant="caption"
        sx={{ color: done ? 'text.secondary' : 'text.disabled', flexShrink: 0 }}
      >
        {done
          ? t(countKey, { vars: { count: step.removed } })
          : t('tech.accountDeletions.stepPending', { vars: { count: step.expected } })}
      </Typography>
    </Stack>
  );
}

interface Props {
  steps: PurgeStep[];
}

/**
 * The run, line by line, as it happens.
 *
 * A single spinner on a "Delete everything" button told the operator nothing:
 * a purge that reaches seventy collections and one that died on the first look
 * identical for as long as it takes. Every reference gets a line, and the line
 * says what it did — deleted, or redacted because the record has to outlive the
 * account.
 */
export default function PurgeProgressList({ steps }: Readonly<Props>) {
  const { t } = useTranslation();
  const done = steps.filter((s) => s.status === 'DONE').length;

  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('tech.accountDeletions.stepProgress', {
          vars: { done, total: steps.length },
        })}
      </Typography>
      <Box sx={{ maxHeight: 300, overflowY: 'auto', pr: 0.5 }}>
        {steps.map((step) => (
          <StepRow key={step.key} step={step} />
        ))}
      </Box>
    </Stack>
  );
}
