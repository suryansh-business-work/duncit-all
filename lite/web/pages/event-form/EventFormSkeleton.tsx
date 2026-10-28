import { Box, Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { Shape, SkeletonFrame } from '../../components/skeletons';

const CARD = `${LITE_RADII.card}px`;
const CONTROL = `${LITE_RADII.control}px`;

/** The event form while it loads: the square cover on the left; calendar, title, when, where, description and options on the right. */
export function EventFormSkeleton() {
  return (
    <SkeletonFrame testId="event-form-skeleton">
      <Box sx={{ display: 'grid', gap: { xs: 3, md: 4 }, gridTemplateColumns: { xs: '1fr', md: '340px 1fr' }, alignItems: 'start' }}>
        <Shape ratio="1 / 1" radius={CARD} />
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
            <Shape width={{ xs: '55%', sm: 260 }} height={40} radius={CONTROL} />
            <Shape width={140} height={40} radius={CONTROL} />
          </Stack>
          <Shape height={{ xs: 64, md: 80 }} radius={CARD} />
          <Shape height={120} radius={CARD} />
          <Shape height={64} radius={CARD} />
          <Shape height={64} radius={CARD} />
          <Shape height={170} radius={CARD} />
        </Stack>
      </Box>
    </SkeletonFrame>
  );
}
