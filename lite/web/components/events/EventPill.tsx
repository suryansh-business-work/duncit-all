import { Link as RouterLink } from 'react-router';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import type { LiteEventCard } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII } from '../../../shared/tokens';
import { paths } from '../../lib/paths';
import { LiteImage } from '../LiteImage';
import { useEventTime } from './useEventTime';

/** A small thumb, the title, and "date · city" — one of the "Upcoming major events". */
export function EventPill({ event }: Readonly<{ event: LiteEventCard }>) {
  const { t } = useWebT();
  const when = useEventTime(event);
  const where = event.location_type === 'VIRTUAL' ? t('lite.common.online') : (event.city_name ?? event.venue_name ?? '');
  return (
    <Card sx={{ minWidth: 0 }} data-testid="event-pill">
      <CardActionArea component={RouterLink} to={paths.event(event.slug)} sx={{ p: 1.25 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Box sx={{ flexShrink: 0, width: 36, height: 36, borderRadius: `${LITE_RADII.control}px`, overflow: 'hidden' }}>
            <LiteImage src={event.cover_url} alt="" width={36} height={36} sx={{ borderRadius: 0 }} />
          </Box>
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
              {event.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {[when.date, where].filter(Boolean).join(' · ')}
            </Typography>
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
