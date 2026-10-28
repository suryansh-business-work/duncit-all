import { Link as RouterLink } from 'react-router';
import { Box, Link, Stack, Typography } from '@mui/material';
import type { LiteEventCard } from '../../../shared/graphql/documents';
import { LITE_MOTION, LITE_RADII } from '../../../shared/tokens';
import { paths } from '../../lib/paths';
import { LiteImage } from '../../../shared/LiteImage';
import { useEventTime } from './useEventTime';

/** A square cover, the title and when it starts — the landing page's "Popular events" row. */
export function EventTile({ event }: Readonly<{ event: LiteEventCard }>) {
  const when = useEventTime(event);
  return (
    <Link
      component={RouterLink}
      to={paths.event(event.slug)}
      underline="none"
      color="inherit"
      sx={{
        display: 'block',
        minWidth: 0,
        '& .lite-tile-cover': { transition: `transform ${LITE_MOTION.base}ms ${LITE_MOTION.ease}` },
        '&:hover .lite-tile-cover, &:focus-visible .lite-tile-cover': { transform: 'translateY(-3px)' },
      }}
      data-testid="event-tile"
    >
      <Stack spacing={1}>
        <Box className="lite-tile-cover" sx={{ borderRadius: `${LITE_RADII.card}px`, overflow: 'hidden', aspectRatio: '1 / 1', bgcolor: 'background.paper' }}>
          <LiteImage src={event.cover_url} alt="" width={320} height={320} sx={{ borderRadius: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 700, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {event.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {when.day}, {when.time}
        </Typography>
      </Stack>
    </Link>
  );
}
