import { useNavigate } from 'react-router';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import HealthMeter from '../../components/health/HealthMeter';
import type { HealthScore } from '../../components/health/queries';
import { useTranslation } from '../../i18n/useTranslation';

function bandHeadline(band: HealthScore['band']): string {
  if (band === 'GREEN') return 'Venue is in great shape.';
  if (band === 'YELLOW') return 'A few things to polish.';
  return 'Needs attention.';
}

interface Props {
  health: HealthScore;
  venueId: string;
}

/** Venue Account Health as a hero card: the meter centred, its headline and
 * the score's make-up under it; the meter taps through to the detail page. */
export default function VenueHealthCard({ health, venueId }: Readonly<Props>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const remarkSuffix = health.adjustments.length === 1 ? '' : 's';
  const deltaLabel = health.delta_sum > 0 ? `+${health.delta_sum}` : String(health.delta_sum);

  return (
    <Card>
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <HealthMeter
            score={health.total_score}
            band={health.band}
            size={140}
            label={t('mweb.venueManage.venueHealth')}
            onClick={() => navigate(`/venues/${venueId}/health`)}
            caption={t('mweb.common.tapForDetails')}
          />
          <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>{bandHeadline(health.band)}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Base activity: {health.base_score}
            {health.delta_sum !== 0 && <> · Admin adjustment: {deltaLabel}</>}
          </Typography>
          {health.adjustments.length > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {health.adjustments.length} admin remark{remarkSuffix} — tap the meter to read.
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
