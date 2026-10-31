import { Paper } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import LiveRunProgress from './LiveRunProgress';
import { KIND_KEYS, type TestsLiveRunKind } from './queries';
import { useLiveRun } from './useLiveRun';

interface Props {
  kind: TestsLiveRunKind;
  runId: string;
  runNo: string;
}

/** A run's own page, while it is live: the same moving reading the strip shows. Nothing once it is over. */
export default function LiveRunPanel({ kind, runId, runNo }: Readonly<Props>) {
  const { t } = useTranslation();
  const state = useLiveRun(kind, runId);
  if (!state) return null;
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <LiveRunProgress
        state={state}
        label={t('tests.live.progressLabel', { vars: { kind: t(KIND_KEYS[kind]), run: runNo } })}
      />
    </Paper>
  );
}
