import { Box, Card, Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { Shape, SkeletonFrame, TextLine, slots } from '../../components/skeletons';
import { TIMELINE_DAY, TIMELINE_RAIL } from './Timeline';

/** One TimelineCard: time, title, place and guests on the left, the square cover on the right. */
function TimelineCardSkeleton() {
  return (
    <Card sx={{ p: 2 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={0.75} sx={{ flexGrow: 1, minWidth: 0 }}>
          <TextLine width="35%" typo="body2" />
          <TextLine width="75%" typo="h4" />
          <TextLine width="55%" typo="body2" />
          <TextLine width="30%" typo="body2" />
        </Stack>
        <Shape width={{ xs: 72, sm: 104 }} ratio="1 / 1" radius={`${LITE_RADII.control}px`} />
      </Stack>
    </Card>
  );
}

/** "Your events" while it loads: days down the left, each with its cards on the dashed rail. */
export function TimelineSkeleton() {
  return (
    <SkeletonFrame testId="timeline-skeleton">
      <Stack spacing={3}>
        {slots('day', 2).map((day, at) => (
          <Box key={day} sx={TIMELINE_DAY}>
            <Stack>
              <TextLine width={110} />
              <TextLine width={70} typo="body2" />
            </Stack>
            <Stack spacing={1.5} sx={TIMELINE_RAIL}>
              {slots(day, at === 0 ? 2 : 1).map((card) => (
                <TimelineCardSkeleton key={card} />
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </SkeletonFrame>
  );
}
