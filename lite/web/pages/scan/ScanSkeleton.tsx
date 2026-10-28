import { Card, Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { Shape, SkeletonFrame, TextLine } from '../../components/skeletons';

/** The door scanner while the event loads: its title, the check-in tally and the camera panel. */
export function ScanSkeleton() {
  return (
    <SkeletonFrame testId="scan-skeleton">
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <TextLine width="20%" typo="body2" />
          <TextLine width="65%" typo="h2" />
        </Stack>
        <Card sx={{ p: 2 }}>
          <Stack spacing={1}>
            <TextLine width="40%" />
            <Shape height={8} radius={`${LITE_RADII.pill}px`} />
          </Stack>
        </Card>
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          <Shape width={{ xs: '100%', sm: 420 }} ratio="1 / 1" radius={`${LITE_RADII.card}px`} />
          <Shape width={180} height={40} radius={`${LITE_RADII.control}px`} />
        </Stack>
      </Stack>
    </SkeletonFrame>
  );
}
