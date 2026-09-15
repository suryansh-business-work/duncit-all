import { Box, Card, LinearProgress, Stack, Typography } from '@mui/material';
import { formatCount, imageSourceUrl, launchProgress } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { CityLaunchStatus } from './queries';

/** Dark scrim over the city photo so the white copy reads on any image. */
const SCRIM = 'linear-gradient(180deg, rgba(9, 9, 15, 0.25) 0%, rgba(9, 9, 15, 0.88) 100%)';

/** The widest the hero draws, device pixels included. */
const HERO_IMAGE_WIDTH = 1080;

const LIVE_DOT_SX = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  bgcolor: 'primary.main',
} as const;

interface Props {
  status: CityLaunchStatus;
  city: string;
}

/**
 * The top of the waitlist: the city's photo under a dark gradient, a Live
 * count tag, the big number of people in, the launch goal and how far along
 * it is. Native twin: components/city-launch/CityLaunchHero.
 */
export default function CityLaunchHero({ status, city }: Readonly<Props>) {
  const { t } = useTranslation();
  const image = status.location.location_image;
  const photo = image ? `url("${imageSourceUrl(image, HERO_IMAGE_WIDTH)}")` : '';
  const backgroundImage = photo ? `${SCRIM}, ${photo}` : SCRIM;
  const progress = launchProgress(status.subscriber_count, status.launch_target);
  const goal = t('mweb.cityLaunch.launchGoal', { vars: { target: formatCount(status.launch_target) } });

  return (
    <Card
      data-testid="city-launch-hero"
      sx={{
        minHeight: 260,
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 3,
        color: 'common.white',
        bgcolor: 'grey.900',
        backgroundImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          alignSelf: 'flex-start',
          alignItems: 'center',
          px: 1.25,
          py: 0.5,
          borderRadius: 999,
          bgcolor: 'rgba(255, 255, 255, 0.16)',
        }}
      >
        <Box aria-hidden sx={LIVE_DOT_SX} />
        <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: '16px' }}>
          {t('mweb.cityLaunch.liveCount')}
        </Typography>
      </Stack>
      <Stack spacing={1}>
        <Typography data-testid="city-launch-count" component="p" sx={{ fontSize: 44, fontWeight: 700, lineHeight: 1.1 }}>
          {formatCount(status.subscriber_count)}
        </Typography>
        <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>
          {t('mweb.cityLaunch.peopleInFor', { vars: { city } })}
        </Typography>
        <LinearProgress
          data-testid="city-launch-progress"
          variant="determinate"
          value={progress}
          aria-label={goal}
          sx={{
            mt: 1,
            height: 8,
            borderRadius: 999,
            bgcolor: 'rgba(255, 255, 255, 0.24)',
            '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: 'primary.main' },
          }}
        />
        <Typography data-testid="city-launch-goal" sx={{ fontSize: 14, lineHeight: 1.4, opacity: 0.9 }}>
          {goal}
        </Typography>
      </Stack>
    </Card>
  );
}
