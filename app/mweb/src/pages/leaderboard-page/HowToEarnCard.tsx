import type { JSX } from 'react';
import { alpha, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import SectionHeader from '../../components/SectionHeader';
import IconDisc from '../account-page/IconDisc';
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
    <Card>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <SectionHeader title={t('mweb.leaderboard.howToTitle')} />
          {active.map((category) => (
            <Stack key={category} direction="row" spacing={1.5} sx={{
              alignItems: "center"
            }}>
              <IconDisc>{EARN_ICON[category]}</IconDisc>
              <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                {t(LEADERBOARD_EARN_KEY[category])}
              </Typography>
              <Chip
                size="small"
                label={t('mweb.leaderboard.earnPoints', {
                  vars: { points: config[LEADERBOARD_POINTS_FIELD[category]] },
                })}
                sx={{
                  color: 'primary.main',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                }}
              />
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
