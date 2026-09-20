import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { formatCount, launchProgress } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { GLASS_SX, LaunchGlass } from './LaunchGlass';

const LIVE_DOT_SX = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  bgcolor: 'success.main',
} as const;

interface Props {
  city: string;
  count: number;
  target: number;
}

/**
 * The heart of the page: the Live count tag, the number of people in, the
 * city they are in for, and the bar from that number to the launch goal with
 * the goal line under it. Native twin: components/city-launch/CityLaunchCount.
 */
export default function CityLaunchCount({ city, count, target }: Readonly<Props>) {
  const { t } = useTranslation();
  const progress = launchProgress(count, target);
  const goal = t('mweb.cityLaunch.launchGoal', { vars: { target: formatCount(target) } });

  return (
    <Stack spacing={1.5}>
      <LaunchGlass testId="city-launch-hero-card" sx={{ alignSelf: 'center', textAlign: 'center', minWidth: 240 }}>
        <Stack spacing={0.75} sx={{ alignItems: 'center' }}>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: 'center', px: 1.25, py: 0.5, borderRadius: 999, bgcolor: 'rgba(255, 255, 255, 0.14)' }}
          >
            <Box aria-hidden sx={LIVE_DOT_SX} />
            <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: '16px' }}>
              {t('mweb.cityLaunch.liveCount')}
            </Typography>
          </Stack>
          <Typography
            data-testid="city-launch-count"
            component="p"
            sx={{ fontSize: 56, fontWeight: 700, lineHeight: 1, color: 'accent.main', letterSpacing: '-0.02em' }}
          >
            {formatCount(count)}
          </Typography>
          <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {t('mweb.cityLaunch.peopleInFor')}
          </Typography>
          <Typography
            data-testid="city-launch-count-city"
            sx={{ fontSize: 36, fontWeight: 700, lineHeight: 1.05, textTransform: 'uppercase', letterSpacing: '0.02em' }}
          >
            {city}
          </Typography>
          <Box aria-hidden sx={{ width: 96, height: 4, borderRadius: 999, bgcolor: 'primary.main' }} />
        </Stack>
      </LaunchGlass>

      <Stack spacing={0.5}>
        <LinearProgress
          data-testid="city-launch-progress"
          variant="determinate"
          value={progress}
          aria-label={goal}
          sx={{
            height: 10,
            borderRadius: 999,
            bgcolor: 'rgba(255, 255, 255, 0.24)',
            '& .MuiLinearProgress-bar': { borderRadius: 999, bgcolor: 'primary.main' },
          }}
        />
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{formatCount(count)}</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{formatCount(target)}</Typography>
        </Stack>
      </Stack>

      <Typography
        data-testid="city-launch-goal"
        sx={{ ...GLASS_SX, alignSelf: 'center', px: 2, py: 1, fontSize: 14, lineHeight: 1.4, textAlign: 'center' }}
      >
        {goal}
      </Typography>
    </Stack>
  );
}
