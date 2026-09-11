import { useQuery } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Box, Card, CardContent, CircularProgress, Stack } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { DuncitRoundButton } from '@duncit/buttons';
import HealthMeter from '../../components/health/HealthMeter';
import HealthBreakdown from '../../components/health/HealthBreakdown';
import TwoToneHeading from '../../components/TwoToneHeading';
import { MY_VENUE_HEALTH, type HealthScore } from '../../components/health/queries';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Venue Health detail for an owned venue: the round back button and the
 * two-tone title (the health, then the venue in muted ink), the meter as a
 * hero card, and the breakdown under it. Native twin: VenueHealthScreen.
 */
export default function VenueHealthPage() {
  const { t } = useTranslation();
  const { venueId = '' } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<{ myVenueHealth: HealthScore | null }>(MY_VENUE_HEALTH, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
    skip: !venueId,
  });

  return (
    <Stack spacing={3} sx={{ mx: { xs: -0.25, sm: 0 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <DuncitRoundButton tone="paper" size="large" onClick={() => navigate(-1)} aria-label={t('mweb.common.back')}>
          <ArrowBackRoundedIcon />
        </DuncitRoundButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TwoToneHeading
            lead={t('mweb.venueManage.venueHealth')}
            trail={data?.myVenueHealth?.subject_label || 'Venue'}
            stacked
            variant="h6"
          />
        </Box>
      </Stack>

      {loading && !data && (
        <Stack
          sx={{
            alignItems: "center",
            py: 4
          }}>
          <CircularProgress size={24} />
        </Stack>
      )}

      {error && <Alert severity="error">{error.message}</Alert>}

      {data?.myVenueHealth && (
        <Stack spacing={3}>
          <Card>
            <CardContent sx={{ p: 3, display: 'flex', justifyContent: 'center', '&:last-child': { pb: 3 } }}>
              <HealthMeter
                score={data.myVenueHealth.total_score}
                band={data.myVenueHealth.band}
                label={t('mweb.venueHealth.venueHealth')}
              />
            </CardContent>
          </Card>
          <Box sx={{ width: '100%' }}>
            <HealthBreakdown score={data.myVenueHealth} />
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
