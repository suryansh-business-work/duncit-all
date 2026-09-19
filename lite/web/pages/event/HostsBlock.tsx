import { Link as RouterLink } from 'react-router';
import { Chip, Link, Stack, Typography } from '@mui/material';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { UserAvatar } from '../../components/UserAvatar';
import { paths } from '../../lib/paths';

/** Who is hosting, each linking to their profile, and the calendar the event belongs to. */
export function HostsBlock({ event }: Readonly<{ event: LiteEvent }>) {
  const { t } = useWebT();
  return (
    <Stack spacing={1.5} data-testid="event-hosts">
      <Typography component="h2" variant="h5">
        {t('liteWeb.event.hosts')}
      </Typography>
      <Stack component="ul" spacing={1} sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {event.hosts.map((host) => (
          <Stack component="li" key={host.user_id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <UserAvatar name={host.name} url={host.avatar_url} size={40} />
            <Link component={RouterLink} to={paths.user(host.handle)} sx={{ fontWeight: 700 }} data-testid={`host-link-${host.handle}`}>
              {host.name}
            </Link>
            {host.role === 'CO_HOST' ? <Chip size="small" variant="outlined" label={t('liteWeb.event.coHost')} /> : null}
          </Stack>
        ))}
      </Stack>
      {event.calendar ? (
        <Typography color="text.secondary">
          {t('liteWeb.event.hostedOn')}{' '}
          <Link component={RouterLink} to={paths.calendar(event.calendar.slug)} sx={{ fontWeight: 700 }} data-testid="event-calendar-link">
            {event.calendar.name}
          </Link>
        </Typography>
      ) : null}
    </Stack>
  );
}
