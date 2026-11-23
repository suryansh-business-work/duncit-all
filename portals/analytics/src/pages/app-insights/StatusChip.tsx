import { Chip, type ChipProps } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SyncIcon from '@mui/icons-material/Sync';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useTranslation } from '@duncit/app-settings';
import type { AppInsightStatus } from './queries';

/** Each status's words, colour and icon — never colour alone. */
const LOOK: Record<AppInsightStatus, { label: string; color: ChipProps['color']; Icon: typeof SyncIcon }> = {
  CONNECTED: { label: 'analytics.appInsights.status.connected', color: 'success', Icon: CheckCircleOutlineIcon },
  DISCONNECTED: { label: 'analytics.appInsights.status.disconnected', color: 'default', Icon: LinkOffIcon },
  SYNCING: { label: 'analytics.appInsights.status.syncing', color: 'info', Icon: SyncIcon },
  ERROR: { label: 'analytics.appInsights.status.error', color: 'error', Icon: ErrorOutlineIcon },
  PENDING: { label: 'analytics.appInsights.status.pending', color: 'warning', Icon: HourglassEmptyIcon },
};

/** A store integration's state as a chip: Connected, Disconnected, Syncing, Error or Waiting for first sync. */
export default function StatusChip({ status, testId }: Readonly<{ status: AppInsightStatus; testId?: string }>) {
  const { t } = useTranslation();
  const { label, color, Icon } = LOOK[status];
  return (
    <Chip
      size="small"
      color={color}
      variant={status === 'DISCONNECTED' ? 'outlined' : 'filled'}
      icon={<Icon fontSize="small" aria-hidden />}
      label={t(label)}
      data-testid={testId}
    />
  );
}
