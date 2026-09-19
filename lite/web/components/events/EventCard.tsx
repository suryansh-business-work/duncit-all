import { Link as RouterLink } from 'react-router';
import { Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import { eventWhen, fromPriceLabel } from '../../../shared/format';
import type { LiteEventCard as LiteEventCardData } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { paths } from '../../lib/paths';
import { LiteImage } from '../LiteImage';
import { EventStatusChip } from '../StatusChips';

interface EventCardProps {
  event: LiteEventCardData;
  /** Where the card goes; the event page unless a host list says otherwise. */
  to?: string;
  /** Show Draft / Cancelled — for a host's own lists. */
  showStatus?: boolean;
}

/** One event in a list: cover, when, where, from-price and who is hosting. */
export function EventCard({ event, to, showStatus = false }: Readonly<EventCardProps>) {
  const { t } = useWebT();
  const when = eventWhen(event.start_at, event.end_at, event.timezone);
  const online = event.location_type === 'VIRTUAL';
  const where = online ? t('lite.common.online') : [event.venue_name, event.city_name].filter(Boolean).join(' · ');
  const price = fromPriceLabel(event.tickets, t('lite.common.free'), (value) => t('liteWeb.events.from', { vars: { price: value } }));
  const hosts = event.hosts.map((host) => host.name).join(', ');
  return (
    <Card component="article" sx={{ height: '100%' }} data-testid="event-card">
      <CardActionArea component={RouterLink} to={to ?? paths.event(event.slug)} sx={{ height: '100%', alignItems: 'stretch', display: 'flex', flexDirection: 'column' }}>
        <LiteImage src={event.cover_url} alt="" width={640} height={360} sx={{ borderRadius: 0 }} />
        <CardContent sx={{ flexGrow: 1, width: '100%' }}>
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              {event.category ? <Chip size="small" label={event.category.name} /> : null}
              {showStatus && event.status !== 'PUBLISHED' ? <EventStatusChip status={event.status} /> : null}
              <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main', ml: 'auto' }}>
                {price}
              </Typography>
            </Stack>
            <Typography variant="h4" component="h3" sx={{ lineHeight: 1.25 }}>
              {event.title}
            </Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <ScheduleOutlinedIcon fontSize="small" aria-hidden />
              <Typography variant="body2">
                {when.date} · {when.time}
              </Typography>
            </Stack>
            {where ? (
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                {online ? <VideocamOutlinedIcon fontSize="small" aria-hidden /> : <PlaceOutlinedIcon fontSize="small" aria-hidden />}
                <Typography variant="body2" noWrap>
                  {where}
                </Typography>
              </Stack>
            ) : null}
            {hosts ? (
              <Typography variant="body2" color="text.secondary" noWrap>
                {t('liteWeb.events.hostedBy', { vars: { names: hosts } })}
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
