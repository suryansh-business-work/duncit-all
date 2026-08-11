import type { JSX } from 'react';
import { Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import GroupsIcon from '@mui/icons-material/Groups';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import {
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_EARN_KEY,
  LEADERBOARD_POINTS_FIELD,
  type LeaderboardCategory,
} from '@duncit/utils';
import type { LeaderboardConfigData } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

const EARN_ICON: Record<LeaderboardCategory, JSX.Element> = {
  USER: <GroupAddIcon fontSize="small" />,
  HOST: <StarBorderIcon fontSize="small" />,
  CLUB_ADMIN: <GroupsIcon fontSize="small" />,
  VENUE: <StorefrontIcon fontSize="small" />,
  BRAND: <ShoppingBagIcon fontSize="small" />,
};

interface Props {
  config: LeaderboardConfigData;
}

/** "How to increase your points" — one line per board, priced live from
 * `leaderboardConfig` so an admin edit changes the promise, not a release. */
export default function HowToEarnCard({ config }: Readonly<Props>) {
  const { t } = useTranslation();
  // A 0-point action is switched off — promising it would be a lie.
  const active = LEADERBOARD_CATEGORIES.filter(
    (category) => (config[LEADERBOARD_POINTS_FIELD[category]] ?? 0) > 0
  );
  if (active.length === 0) return null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('mweb.leaderboard.howToTitle')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('mweb.leaderboard.howToSubtitle')}
            </Typography>
          </Stack>
          {active.map((category) => (
            <Stack key={category} direction="row" alignItems="center" spacing={1.5}>
              <Stack sx={{ color: 'primary.main' }}>{EARN_ICON[category]}</Stack>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {t(LEADERBOARD_EARN_KEY[category])}
              </Typography>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={t('mweb.leaderboard.earnPoints', {
                  vars: { points: config[LEADERBOARD_POINTS_FIELD[category]] },
                })}
              />
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
