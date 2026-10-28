import { Box, Card, Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { Dot, Shape, SkeletonFrame, TextLine, slots } from '../../components/skeletons';
import { CALENDAR_GRID } from './MyCalendars';

const CONTROL = `${LITE_RADII.control}px`;

/** A grid of calendar cards (avatar, name, two lines) while My or Subscribed calendars load. */
export function CalendarCardsSkeleton({ testId = 'calendar-cards-skeleton' }: Readonly<{ testId?: string }>) {
  return (
    <SkeletonFrame testId={testId}>
      <Box sx={CALENDAR_GRID}>
        {slots('calendar', 3).map((card) => (
          <Card key={card} sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Shape width={48} height={48} radius={2} />
              <Stack spacing={0.25}>
                <TextLine width="60%" />
                <TextLine width="45%" typo="body2" />
                <TextLine width="35%" typo="body2" />
              </Stack>
            </Stack>
          </Card>
        ))}
      </Box>
    </SkeletonFrame>
  );
}

/** The calendar form while the calendar loads: the cover-and-avatar card, then Customization. */
export function CalendarFormSkeleton() {
  return (
    <SkeletonFrame testId="calendar-form-skeleton">
      <Stack spacing={3}>
        <Card>
          <Shape height={{ xs: 140, sm: 200 }} radius={0} />
          <Stack spacing={2} sx={{ px: { xs: 2, sm: 2.5 }, pb: 2.5 }}>
            <Box sx={{ mt: '-36px' }}>
              <Shape width={72} height={72} radius={2} />
            </Box>
            <TextLine width="50%" typo="h3" />
            <TextLine width="70%" />
          </Stack>
        </Card>
        <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={2}>
            <TextLine width={160} typo="h5" />
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={0.75}>
                  {slots('tint', 9).map((dot) => (
                    <Dot key={dot} size={24} />
                  ))}
                </Stack>
                <Shape height={56} radius={CONTROL} />
              </Stack>
              <Stack spacing={1.25}>
                <Shape width={180} height={32} radius={CONTROL} />
                <Shape height={56} radius={CONTROL} />
              </Stack>
            </Box>
          </Stack>
        </Card>
      </Stack>
    </SkeletonFrame>
  );
}
