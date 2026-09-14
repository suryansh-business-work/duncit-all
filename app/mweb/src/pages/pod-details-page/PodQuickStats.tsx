import { Box, Divider, Stack, Typography } from '@mui/material';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  spotsTaken: number;
  spotsTotal: number;
}

/** A spot count this low is worth a second look before booking. */
const FEW_SPOTS = 3;

interface StatProps {
  label: string;
  value: number;
  warn?: boolean;
  testId: string;
}

function Stat({ label, value, warn, testId }: Readonly<StatProps>) {
  return (
    <Box data-testid={testId} sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 600, lineHeight: 1.2, color: warn ? 'warning.main' : 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * How full the pod is, at a glance: people in beside spots left. The view
 * counter was removed — a number nobody can act on, next to the one that
 * decides whether to book — and the separate "N spots left" chip folded into
 * the Spots-left figure, which turns amber when only a few remain.
 */
export default function PodQuickStats({ spotsTaken, spotsTotal }: Readonly<Props>) {
  const { t } = useTranslation();
  const remaining = Math.max(spotsTotal - spotsTaken, 0);
  const few = spotsTotal > 0 && remaining <= FEW_SPOTS;

  return (
    <Stack
      direction="row"
      divider={<Divider orientation="vertical" flexItem />}
      spacing={2}
      data-testid="pod-quick-stats"
      sx={{ ...SURFACE_SX, px: 2, py: 1.5 }}
    >
      <Stat label={t('mweb.podDetails.peopleIn')} value={spotsTaken} testId="pod-info-attendees-stat" />
      <Box data-tour="pod-spots" sx={{ flex: 1, minWidth: 0, display: 'flex' }}>
        <Stat
          label={t('mweb.podDetails.spotsLeft')}
          value={remaining}
          warn={few}
          testId="pod-info-spots-left-stat"
        />
      </Box>
    </Stack>
  );
}
