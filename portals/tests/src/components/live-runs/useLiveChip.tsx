import type { ReactElement } from 'react';
import { CircularProgress } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { TestsLiveRunKind } from './queries';
import { useLiveRun } from './useLiveRun';

/** The chip's ring, in px — the size every live chip in the console already used. */
const RING = 12;
const THICKNESS = 6;

/**
 * What a live run's status chip wears: a ring that fills with the run's
 * progress and "Running · 42%", or the old spinner and the bare status while
 * there is no number to show. Pass a null `runId` for a row that is not a run.
 */
export function useLiveChip(
  kind: TestsLiveRunKind,
  runId: string | null,
  label: string
): { icon: ReactElement; label: string } {
  const { t } = useTranslation();
  const percent = useLiveRun(kind, runId)?.progress.percent ?? null;
  if (percent === null) {
    return { icon: <CircularProgress size={RING} thickness={THICKNESS} color="inherit" aria-hidden />, label };
  }
  return {
    icon: <CircularProgress variant="determinate" value={percent} size={RING} thickness={THICKNESS} color="inherit" aria-hidden />,
    label: t('tests.live.chip', { vars: { status: label, percent: String(percent) } }),
  };
}
