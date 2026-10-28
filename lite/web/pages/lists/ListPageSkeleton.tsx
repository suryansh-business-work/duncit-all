import { Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { EventGroupsSkeleton, Shape, SkeletonFrame, TextLine } from '../../components/skeletons';

/** A city or category page while it loads: the title, its count, the search box (cities have one), then the events. */
export function ListPageSkeleton({ withSearch = false }: Readonly<{ withSearch?: boolean }>) {
  return (
    <SkeletonFrame testId="list-page-skeleton">
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <TextLine width="45%" typo="h4" />
          <TextLine width="25%" />
        </Stack>
        {withSearch ? <Shape height={48} radius={`${LITE_RADII.control}px`} /> : null}
        <EventGroupsSkeleton groups={1} />
      </Stack>
    </SkeletonFrame>
  );
}
