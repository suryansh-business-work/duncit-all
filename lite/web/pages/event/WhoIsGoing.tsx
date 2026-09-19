import { Stack, Typography } from '@mui/material';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { spotsLeft } from './registrationView';

/** How many are going, how many are waiting, and how many seats are left when the host set a limit. */
export function WhoIsGoing({ event }: Readonly<{ event: LiteEvent }>) {
  const { t } = useWebT();
  const left = spotsLeft(event);
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }} data-testid="event-going">
      <GroupsOutlinedIcon sx={{ color: 'primary.main', mt: 0.5 }} aria-hidden />
      <Stack spacing={0.5}>
        <Typography component="h2" variant="h5">
          {t('liteWeb.event.whoIsGoing')}
        </Typography>
        <Typography color="text.secondary">{t('liteWeb.event.goingCount', { count: event.stats.going })}</Typography>
        {event.stats.waitlisted > 0 ? <Typography color="text.secondary">{t('liteWeb.event.waitlistedCount', { count: event.stats.waitlisted })}</Typography> : null}
        {left === null ? null : <Typography color="text.secondary">{t('liteWeb.event.spotsLeft', { count: left })}</Typography>}
      </Stack>
    </Stack>
  );
}
