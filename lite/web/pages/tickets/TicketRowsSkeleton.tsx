import { Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { Shape, SkeletonFrame, TextLine, slots } from '../../components/skeletons';

/** "Your tickets" while it loads: the TicketRow shape (cover, title, when, ticket, status) a few times over. */
export function TicketRowsSkeleton() {
  return (
    <SkeletonFrame testId="tickets-skeleton">
      <Stack spacing={1}>
        {slots('ticket', 4).map((row) => (
          <Stack key={row} direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.5, borderRadius: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Shape width={72} height={72} radius={2} />
            <Stack spacing={0.25} sx={{ flexGrow: 1, minWidth: 0 }}>
              <TextLine width="60%" />
              <TextLine width="40%" typo="body2" />
              <TextLine width="50%" typo="body2" />
            </Stack>
            <Shape width={84} height={24} radius={`${LITE_RADII.pill}px`} />
          </Stack>
        ))}
      </Stack>
    </SkeletonFrame>
  );
}
