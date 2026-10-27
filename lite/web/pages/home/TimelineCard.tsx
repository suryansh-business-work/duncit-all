import { Link as RouterLink } from 'react-router';
import { Box, Card, CardActionArea, Chip, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII } from '../../../shared/tokens';
import { LiteImage } from '../../components/LiteImage';
import { EventStatusChip } from '../../components/StatusChips';
import { useEventTime } from '../../components/events/useEventTime';
import { paths } from '../../lib/paths';
import type { MyEvent } from './useMyEvents';

/** One event on the timeline: time, title, place, guests, and Manage for a host. */
export function TimelineCard({ item }: Readonly<{ item: MyEvent }>) {
  const { t } = useWebT();
  const { event, role } = item;
  const when = useEventTime(event);
  const online = event.location_type === 'VIRTUAL';
  const where = online ? t('lite.common.online') : [event.venue_name, event.city_name].filter(Boolean).join(' · ');
  const hosting = role === 'HOSTING';
  return (
    <Card data-testid="timeline-card">
      <CardActionArea component={RouterLink} to={paths.event(event.slug)} sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Stack spacing={0.75} sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">
              {when.time}
            </Typography>
            <Typography variant="h3" component="h3" sx={{ fontSize: '1.15rem', lineHeight: 1.3 }}>
              {event.title}
            </Typography>
            {where ? (
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                {online ? <VideocamOutlinedIcon sx={{ fontSize: 18 }} aria-hidden /> : <PlaceOutlinedIcon sx={{ fontSize: 18 }} aria-hidden />}
                <Typography variant="body2" noWrap>
                  {where}
                </Typography>
              </Stack>
            ) : null}
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <GroupOutlinedIcon sx={{ fontSize: 18 }} aria-hidden />
              <Typography variant="body2">{t('liteWeb.home.guests', { count: event.stats.going })}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', pt: 0.5 }}>
              {hosting ? null : <Chip size="small" color="success" variant="outlined" label={t('liteWeb.home.going')} />}
              {event.status === 'PUBLISHED' ? null : <EventStatusChip status={event.status} />}
            </Stack>
          </Stack>
          <Box sx={{ flexShrink: 0, width: { xs: 72, sm: 104 }, borderRadius: `${LITE_RADII.control}px`, overflow: 'hidden' }}>
            <LiteImage src={event.cover_url} alt="" width={104} height={104} sx={{ borderRadius: 0 }} />
          </Box>
        </Stack>
      </CardActionArea>
      {hosting ? (
        <Box sx={{ px: 2, pb: 2, mt: -0.5 }}>
          <DuncitButton component={RouterLink} to={paths.eventManage(event.slug)} size="small" endIcon={<ArrowForwardIcon />} sx={{ borderRadius: LITE_RADII.control }} data-testid="timeline-manage">
            {t('liteWeb.home.manage')}
          </DuncitButton>
        </Box>
      ) : null}
    </Card>
  );
}
