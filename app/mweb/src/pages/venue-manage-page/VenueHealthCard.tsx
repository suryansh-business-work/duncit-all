import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import HealthMeter from '../../components/health/HealthMeter';
import type { HealthScore } from '../../components/health/queries';

function bandHeadline(band: HealthScore['band']): string {
  if (band === 'GREEN') return 'Venue is in great shape.';
  if (band === 'YELLOW') return 'A few things to polish.';
  return 'Needs attention.';
}

interface Props {
  health: HealthScore;
  venueId: string;
}

/** Venue Account Health meter + its headline; taps through to the detail page. */
export default function VenueHealthCard({ health, venueId }: Readonly<Props>) {
  const navigate = useNavigate();
  const remarkSuffix = health.adjustments.length === 1 ? '' : 's';
  const deltaLabel = health.delta_sum > 0 ? `+${health.delta_sum}` : String(health.delta_sum);

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <HealthMeter
            score={health.total_score}
            band={health.band}
            size={140}
            label="Venue Health"
            onClick={() => navigate(`/venues/${venueId}/health`)}
            caption="Tap for details"
          />
          <Box sx={{ flex: 1, minWidth: 0, textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {bandHeadline(health.band)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Base activity: {health.base_score}
              {health.delta_sum !== 0 && <> · Admin adjustment: {deltaLabel}</>}
            </Typography>
            {health.adjustments.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                {health.adjustments.length} admin remark{remarkSuffix} — tap the meter to read.
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
