import { Box, Card, Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { Shape, SkeletonFrame, TextLine, slots } from '../../components/skeletons';

const CARD = `${LITE_RADII.card}px`;

/** Two stat tiles over the views chart: the Insights tab's own wait (the range picker stays live above it). */
export function InsightsSkeleton() {
  return (
    <SkeletonFrame testId="insights-skeleton">
      <Stack spacing={2}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {slots('stat', 2).map((stat) => (
            <Card key={stat} sx={{ p: 2 }}>
              <TextLine width="45%" typo="body2" />
              <TextLine width="30%" typo="h3" />
            </Card>
          ))}
        </Box>
        <Shape height={240} radius={CARD} />
      </Stack>
    </SkeletonFrame>
  );
}

/** Manage while the event loads: calendar and title, the tab strip, and the overview's tiles and cards. */
export function ManageSkeleton() {
  return (
    <SkeletonFrame testId="manage-skeleton" sx={{ maxWidth: 820, mx: 'auto' }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Stack spacing={0.5} sx={{ flexGrow: 1 }}>
            <TextLine width="25%" typo="body2" />
            <TextLine width="70%" typo="h2" />
          </Stack>
          <Shape width={120} height={32} radius={`${LITE_RADII.control}px`} />
        </Stack>
        <Stack direction="row" spacing={3} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1.25 }}>
          {slots('tab', 5).map((tab) => (
            <TextLine key={tab} width={64} typo="body2" />
          ))}
        </Stack>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' } }}>
            {slots('tile', 3).map((tile) => (
              <Shape key={tile} height={88} radius={CARD} />
            ))}
          </Box>
          <Shape height={150} radius={CARD} />
          <Shape height={120} radius={CARD} />
        </Stack>
      </Stack>
    </SkeletonFrame>
  );
}
