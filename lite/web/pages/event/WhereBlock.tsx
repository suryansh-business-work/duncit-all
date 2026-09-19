import { Link, Stack, Typography } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';

/** In person: the venue, the address and a map link. Online: the join link once the reader may see it. */
export function WhereBlock({ event }: Readonly<{ event: LiteEvent }>) {
  const { t } = useWebT();
  const online = event.location_type === 'VIRTUAL';
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }} data-testid="event-where">
      {online ? <VideocamOutlinedIcon sx={{ color: 'primary.main', mt: 0.5 }} aria-hidden /> : <PlaceOutlinedIcon sx={{ color: 'primary.main', mt: 0.5 }} aria-hidden />}
      <Stack spacing={0.5}>
        <Typography component="h2" variant="h5">
          {online ? t('lite.common.online') : (event.venue_name ?? event.address ?? '')}
        </Typography>
        {online ? (
          event.virtual_link ? (
            <Link href={event.virtual_link} target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 700, wordBreak: 'break-all' }} data-testid="event-join-link">
              {t('liteWeb.event.joinLink')}
            </Link>
          ) : (
            <Typography color="text.secondary">{t('liteWeb.event.onlineNote')}</Typography>
          )
        ) : (
          <>
            {event.venue_name && event.address ? <Typography color="text.secondary">{event.address}</Typography> : null}
            {event.city_name ? <Typography color="text.secondary">{event.city_name}</Typography> : null}
            {event.map_url ? (
              <Link href={event.map_url} target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 700 }} data-testid="event-map-link">
                {t('liteWeb.event.openMap')}
              </Link>
            ) : null}
          </>
        )}
      </Stack>
    </Stack>
  );
}
