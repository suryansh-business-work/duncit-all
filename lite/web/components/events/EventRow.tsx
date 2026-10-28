import { Link as RouterLink } from 'react-router';
import { Box, Link, Stack, Typography } from '@mui/material';
import type { LiteEventCard } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII } from '../../../shared/tokens';
import { paths } from '../../lib/paths';
import { LiteImage } from '../../../shared/LiteImage';
import { useEventTime } from './useEventTime';

/** Thumb, "date, time", the title and the place — Discover's "Popular events" list. */
export function EventRow({ event }: Readonly<{ event: LiteEventCard }>) {
  const { t } = useWebT();
  const when = useEventTime(event);
  const where = event.location_type === 'VIRTUAL' ? t('lite.common.online') : [event.venue_name, event.city_name].filter(Boolean).join(' · ');
  return (
    <Link component={RouterLink} to={paths.event(event.slug)} underline="none" color="inherit" sx={{ display: 'block', borderRadius: 1, p: 0.75, mx: -0.75, '&:hover': { bgcolor: 'action.hover' } }} data-testid="event-row">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Box sx={{ flexShrink: 0, width: 68, height: 68, borderRadius: `${LITE_RADII.control}px`, overflow: 'hidden' }}>
          <LiteImage src={event.cover_url} alt="" width={68} height={68} sx={{ borderRadius: 0 }} />
        </Box>
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            {when.date}, {when.time}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {event.title}
          </Typography>
          {where ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {where}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Link>
  );
}
