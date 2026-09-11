import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { sortBadgeProgress } from '@duncit/utils';
import TwoToneHeading from '../../components/TwoToneHeading';
import BadgeProgressCard from './BadgeProgressCard';
import { MY_BADGE_PROGRESS, type MyBadgeProgressData } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * The Badges section — every badge Duncit publishes, each stating the goal it
 * asks for and the window that goal has to happen in, with the member's own
 * progress against it. Reaching a goal unlocks the badge here and shows it on
 * their profile.
 *
 * Twin of the native BadgesScreen (rule 27); reached from the sidebar row that
 * sits under FAQs.
 */
export default function BadgesPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<MyBadgeProgressData>(MY_BADGE_PROGRESS, {
    fetchPolicy: 'cache-and-network',
  });

  const rows = sortBadgeProgress(data?.myBadgeProgress ?? []);
  const unlocked = rows.filter((row) => row.achieved).length;

  let body = null;
  if (loading && !data) {
    body = (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  } else if (error) {
    body = <Alert severity="error">{t('mweb.badges.loadError')}</Alert>;
  } else if (rows.length === 0) {
    body = (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.badges.empty')}
      </Typography>
    );
  } else {
    body = (
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
        }}
      >
        {rows.map((row) => (
          <BadgeProgressCard key={row.badge.id} row={row} />
        ))}
      </Box>
    );
  }

  // The summary is the heading's muted second beat — "Badges / 3 of 10 unlocked".
  const summary =
    rows.length > 0 ? t('mweb.badges.summary', { vars: { unlocked, total: rows.length } }) : null;

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 720, mx: 'auto', px: { xs: 0.5, sm: 0 }, pb: 6 }}>
      <TwoToneHeading lead={t('mweb.badges.title')} trail={summary} stacked />
      {body}
    </Stack>
  );
}
