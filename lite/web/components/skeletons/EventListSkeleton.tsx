import { Box, Card, CardContent, Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { EVENT_GRID } from '../events/EventDayGroup';
import { Shape, SkeletonFrame, TextLine, slots } from './shapes';

/** One EventCard: the 16:9 cover, category and price, title, when, where and who hosts. */
export function EventCardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
      <Shape ratio="16 / 9" radius={0} />
      <CardContent>
        <Stack spacing={0.75}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Shape width={72} height={24} radius={`${LITE_RADII.pill}px`} />
            <TextLine width={48} typo="body2" />
          </Stack>
          <TextLine width="85%" typo="h4" />
          <TextLine width="60%" typo="body2" />
          <TextLine width="70%" typo="body2" />
          <TextLine width="45%" typo="body2" />
        </Stack>
      </CardContent>
    </Card>
  );
}

/** Day headings over EventCards, unframed, for a page skeleton that already announces itself. */
export function EventGroupsSkeleton({ groups = 2 }: Readonly<{ groups?: number }>) {
  return (
    <Stack spacing={4}>
      {slots('day', groups).map((day) => (
        <Stack key={day} spacing={1.5}>
          <TextLine width={180} typo="h3" />
          <Box sx={EVENT_GRID}>
            {slots(day, 3).map((card) => (
              <EventCardSkeleton key={card} />
            ))}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

/** An EventList while it loads: the same day groups and card grid. */
export function EventListSkeleton({ groups = 2 }: Readonly<{ groups?: number }>) {
  return (
    <SkeletonFrame testId="event-list-skeleton">
      <EventGroupsSkeleton groups={groups} />
    </SkeletonFrame>
  );
}
