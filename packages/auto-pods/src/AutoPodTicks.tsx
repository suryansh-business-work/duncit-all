import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { autoPodTicks, type AutoPodRole, type AutoPodRow } from '@duncit/utils';
import type { AutoPodLabels } from '@duncit/utils';

export interface AutoPodTicksProps {
  row: Pick<AutoPodRow, 'venue_claim' | 'host_claim' | 'club_claim'>;
  labels: AutoPodLabels;
  size?: 'small' | 'medium';
}

/**
 * The three enrolments an Auto Pod needs, always shown together and always in
 * order: Venue Enroll, Host Enroll, Club Admin Enroll. Amber while that partner
 * has yet to enrol, green the moment they do — so one glance says how far along
 * the offer is without reading a word.
 */
export function AutoPodTicks({ row, labels, size = 'small' }: Readonly<AutoPodTicksProps>) {
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {autoPodTicks(row).map((tick) => (
        <Chip
          key={tick.role}
          size={size}
          color={tick.done ? 'success' : 'warning'}
          variant={tick.done ? 'filled' : 'outlined'}
          icon={tick.done ? <CheckCircleIcon /> : <HourglassEmptyIcon />}
          label={labels.tick(tick.role as AutoPodRole)}
          aria-label={`${labels.tick(tick.role as AutoPodRole)} — ${
            tick.done ? labels.tickDone : labels.tickPending
          }`}
        />
      ))}
    </Stack>
  );
}
