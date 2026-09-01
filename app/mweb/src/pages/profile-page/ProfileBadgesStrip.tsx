import { useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Avatar, Box, Card, CardContent, Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { DuncitButton } from '@duncit/buttons';
import { sortBadgeProgress } from '@duncit/utils';
import { MY_BADGE_PROGRESS, type MyBadgeProgressData } from '../badges-page/queries';
import { useTranslation } from '../../i18n/useTranslation';

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
  const { data } = useQuery<MyBadgeProgressData>(MY_BADGE_PROGRESS, {
    fetchPolicy: 'cache-and-network',
  });

  const earned = sortBadgeProgress(data?.myBadgeProgress ?? []).filter((row) => row.achieved);

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
          <EmojiEventsIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
            {t('mweb.profile.badges')}
          </Typography>
          <DuncitButton size="small" onClick={() => navigate('/badges')} sx={{ fontWeight: 700 }}>
            {t('mweb.badges.viewAll')}
          </DuncitButton>
        </Stack>
        {earned.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('mweb.badges.profileEmpty')}
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: 'repeat(3,1fr)', sm: 'repeat(4,1fr)' },
            }}
          >
            {earned.map((row) => (
              <Stack key={row.badge.id} spacing={0.5} sx={{ alignItems: 'center' }}>
                <Avatar
                  src={row.badge.image_url || undefined}
                  sx={{ width: 56, height: 56, bgcolor: 'primary.light' }}
                >
                  {!row.badge.image_url && <EmojiEventsIcon />}
                </Avatar>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}
                >
                  {row.badge.title}
                </Typography>
              </Stack>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
