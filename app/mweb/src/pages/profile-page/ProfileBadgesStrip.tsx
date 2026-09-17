import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsOutlined';
import { sortBadgeProgress } from '@duncit/utils';
import SectionHeader from '../../components/SectionHeader';
import { MY_BADGE_PROGRESS, type BadgeProgressRow, type MyBadgeProgressData } from '../badges-page/queries';
import { useTranslation } from '../../i18n/useTranslation';

const GRID_SX: SxProps<Theme> = {
  display: 'grid',
  gap: 1.5,
  gridTemplateColumns: { xs: 'repeat(4,1fr)', sm: 'repeat(6,1fr)' },
};

/** Stable keys for the placeholder tiles shown while the first read is out. */
const PLACEHOLDER_IDS = ['first', 'second', 'third', 'fourth'];

/** Placeholder tiles on the same grid as the real badges, so the card does not
 * jump when they arrive. Twin of the native `BadgesStripSkeleton`. */
function BadgesStripSkeleton() {
  const { t } = useTranslation();
  return (
    <Box
      data-testid="profile-badges-strip-loading"
      role="progressbar"
      aria-busy
      aria-label={t('mweb.a11y.loading')}
      sx={GRID_SX}
    >
      {PLACEHOLDER_IDS.map((id) => (
        <Stack key={id} spacing={0.75} sx={{ alignItems: 'center' }}>
          <Skeleton variant="circular" width={56} height={56} />
          <Skeleton variant="text" width={52} sx={{ fontSize: 13 }} />
        </Stack>
      ))}
    </Box>
  );
}

interface StripBodyProps {
  loading: boolean;
  earned: BadgeProgressRow[];
}

function StripBody({ loading, earned }: Readonly<StripBodyProps>) {
  const { t } = useTranslation();

  if (loading) return <BadgesStripSkeleton />;
  if (earned.length === 0) {
    return (
      <Typography data-testid="profile-badges-strip-empty" variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.badges.profileEmpty')}
      </Typography>
    );
  }
  return (
    <Box data-testid="profile-badges-strip-grid" sx={GRID_SX}>
      {earned.map((row) => (
        <Stack
          key={row.badge.id}
          data-testid={`profile-badges-strip-badge-${row.badge.id}`}
          spacing={0.75}
          sx={{ alignItems: 'center', minWidth: 0 }}
        >
          <Avatar
            src={row.badge.image_url || undefined}
            alt=""
            sx={{ width: 56, height: 56, bgcolor: 'action.hover', color: 'secondary.main' }}
          >
            {!row.badge.image_url && <EmojiEventsIcon />}
          </Avatar>
          <Typography
            sx={{ fontSize: 13, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}
          >
            {row.badge.title}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}

/**
 * The member's earned badges, shown on their own profile directly under the
 * followers/following row. Only what they have actually unlocked appears here —
 * the full catalogue, with every goal and how far along they are, lives on the
 * Badges page this card links to.
 *
 * Twin of the native <ProfileBadgesStrip/> (rule 27); both read the same
 * `myBadgeProgress` query the Badges page does.
 */
export default function ProfileBadgesStrip() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading } = useQuery<MyBadgeProgressData>(MY_BADGE_PROGRESS, {
    fetchPolicy: 'cache-and-network',
  });

  const earned = sortBadgeProgress(data?.myBadgeProgress ?? []).filter((row) => row.achieved);

  return (
    <Card data-testid="profile-badges-strip">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ mb: 1.5 }}>
          <SectionHeader
            testId="profile-badges-strip-header"
            actionTestId="profile-badges-strip-view-all"
            title={t('mweb.profile.badges')}
            actionLabel={t('mweb.badges.viewAll')}
            onAction={() => navigate('/badges')}
          />
        </Box>
        <StripBody loading={loading && !data} earned={earned} />
      </CardContent>
    </Card>
  );
}
