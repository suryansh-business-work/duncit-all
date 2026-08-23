import { Paper, Stack, Typography } from '@mui/material';
import StatusDot, { type DotState } from './StatusDot';
import { useTranslation } from '../i18n';
import { stateChipColor } from '../utils/status';
import type { OverallRoll } from '../types';

/** The translator this banner and its pure derivation read their copy from. */
type Translate = ReturnType<typeof useTranslation>['t'];

export interface OverallStatus {
  severity: DotState;
  message: string;
}

/** Pure derivation from the server roll-up, exported for unit tests. */
export function deriveOverallStatus(
  overall: OverallRoll | null | undefined,
  t: Translate,
): OverallStatus {
  if (!overall) return { severity: 'info', message: t('status.board.checking') };
  const { operational, total, down, degraded } = overall;
  if (total === 0) return { severity: 'info', message: t('status.board.awaiting') };
  if (operational === total) {
    return { severity: 'success', message: t('status.board.allOperational') };
  }
  const chip = stateChipColor(overall.state);
  const severity: DotState = chip === 'error' ? 'error' : 'warning';
  const issues = down + degraded;
  // Two whole sentences rather than a noun slotted into one: a language that
  // orders the clause differently cannot be built by concatenation.
  const key = down > 0 && degraded === 0 ? 'status.board.outage' : 'status.board.reportingIssues';
  return { severity, message: t(key, { vars: { issues, total } }) };
}

interface BannerProps {
  overall: OverallRoll | null | undefined;
  lastUpdated: Date | null;
}

export default function OverallStatusBanner({ overall, lastUpdated }: Readonly<BannerProps>) {
  const { t } = useTranslation();
  const status = deriveOverallStatus(overall, t);
  return (
    <Paper variant="outlined" sx={{ px: 2.5, py: 1.75, mb: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <StatusDot state={status.severity} size={12} />
          <Typography fontWeight={700}>{status.message}</Typography>
        </Stack>
        {lastUpdated && (
          <Typography variant="body2" color="text.secondary">
            {t('status.board.lastChecked', { vars: { time: lastUpdated.toLocaleTimeString() } })}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
