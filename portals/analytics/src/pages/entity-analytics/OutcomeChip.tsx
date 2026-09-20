import type { ReactElement } from 'react';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import { useTranslation } from '@duncit/app-settings';
import { StatusChip, type StatusColorMap } from '@duncit/ui';

type Outcome = 'PASSED' | 'FAILED' | 'UNTESTED';

const COLORS: StatusColorMap = { PASSED: 'success', FAILED: 'error', UNTESTED: 'default' };

const LABELS: Record<Outcome, string> = {
  PASSED: 'analytics.outcome.passed',
  FAILED: 'analytics.outcome.failed',
  UNTESTED: 'analytics.outcome.untested',
};

const ICONS: Record<Outcome, ReactElement> = {
  PASSED: <CheckCircleOutlinedIcon />,
  FAILED: <ErrorOutlinedIcon />,
  UNTESTED: <HelpOutlinedIcon />,
};

/** The OUTCOME format's value: 1 passed, 0 failed, null never run. */
function outcomeOf(value: number | null | undefined): Outcome {
  if (value === null || value === undefined) return 'UNTESTED';
  return value === 1 ? 'PASSED' : 'FAILED';
}

/** A check's result as a chip that says it in words and with an icon, never by colour alone. */
export default function OutcomeChip({ value }: Readonly<{ value: number | null | undefined }>) {
  const { t } = useTranslation();
  const outcome = outcomeOf(value);
  return (
    <StatusChip
      status={outcome}
      colorMap={COLORS}
      label={t(LABELS[outcome])}
      icon={ICONS[outcome]}
      variant="outlined"
      data-testid={`analytics-outcome-${outcome.toLowerCase()}`}
    />
  );
}
