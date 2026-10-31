import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import RunProgressBar from './RunProgressBar';
import { percentText, sourceText, statusText } from './progress-labels';
import type { LiveRunState } from './useLiveRun';

interface Props {
  state: LiveRunState;
  /** What the bar measures, for a screen reader — e.g. "Unit tests DUN-UT-000123 progress". */
  label: string;
}

/**
 * One live run's reading: what it is doing and its percentage, the moving bar,
 * then how long is left and where that estimate came from. Amber once the run
 * has gone past its usual length, so "nearly done" is never claimed for it.
 */
export default function LiveRunProgress({ state, label }: Readonly<Props>) {
  const { t } = useTranslation();
  const { run, progress } = state;
  const status = statusText(t, run, progress);
  const percent = percentText(t, progress);
  const tone = progress.overdue ? 'warning' : 'info';
  const source = percent ? sourceText(t, run) : null;

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
        <Typography
          variant="body2"
          noWrap
          sx={{ minWidth: 0, color: progress.overdue ? 'warning.main' : 'text.secondary' }}
        >
          {status}
        </Typography>
        {percent && (
          <Typography
            variant="h6"
            component="p"
            aria-hidden
            sx={{ fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: `${tone}.main` }}
          >
            {percent}
          </Typography>
        )}
      </Stack>
      <RunProgressBar
        value={progress.percent}
        tone={tone}
        label={label}
        valueText={[percent, status].filter(Boolean).join(', ')}
      />
      {(run.stage || source) && (
        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', minWidth: 0 }}>
            {run.stage}
          </Typography>
          {source && (
            <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
              {source}
            </Typography>
          )}
        </Stack>
      )}
    </Stack>
  );
}
