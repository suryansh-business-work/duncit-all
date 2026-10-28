import { Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { EventGroupsSkeleton, Shape, SkeletonFrame, TextLine, slots } from '../../components/skeletons';

/** A calendar's page while it loads: the cover band, avatar, name and Subscribe, the tabs, then its events. */
export function CalendarPageSkeleton() {
  return (
    <SkeletonFrame testId="calendar-skeleton">
      <Stack spacing={3}>
        <Stack spacing={2}>
          <Shape height={{ xs: 96, sm: 140 }} radius={4} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <Shape width={72} height={72} radius="50%" />
            <Stack sx={{ flexGrow: 1 }}>
              <TextLine width="45%" typo="h4" />
              <TextLine width="35%" typo="body2" />
            </Stack>
            <Shape width={112} height={36} radius={`${LITE_RADII.control}px`} />
          </Stack>
          <TextLine width="80%" />
        </Stack>
        <Stack direction="row" spacing={3} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1.25 }}>
          {slots('tab', 2).map((tab) => (
            <TextLine key={tab} width={72} typo="body2" />
          ))}
        </Stack>
        <EventGroupsSkeleton groups={1} />
      </Stack>
    </SkeletonFrame>
  );
}
