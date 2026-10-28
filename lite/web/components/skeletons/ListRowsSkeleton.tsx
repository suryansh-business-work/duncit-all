import { Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { Shape, SkeletonFrame, TextLine, slots } from './shapes';

interface ListRowsSkeletonProps {
  rows?: number;
  /** A status chip before the action, as the guest list has. */
  chip?: boolean;
  testId?: string;
}

/** Rows in a bordered panel, a name and a detail line with an action at the end: the guest list, the check-in search. */
export function ListRowsSkeleton({ rows = 5, chip = true, testId = 'list-rows-skeleton' }: Readonly<ListRowsSkeletonProps>) {
  return (
    <SkeletonFrame testId={testId}>
      <Stack sx={{ border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', overflow: 'hidden' }}>
        {slots('row', rows).map((row) => (
          <Stack key={row} direction="row" spacing={2} sx={{ alignItems: 'center', px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}>
            <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
              <TextLine width="40%" />
              <TextLine width="60%" typo="body2" />
            </Stack>
            {chip ? <Shape width={84} height={24} radius={`${LITE_RADII.pill}px`} /> : null}
            <Shape width={88} height={30} radius={`${LITE_RADII.control}px`} />
          </Stack>
        ))}
      </Stack>
    </SkeletonFrame>
  );
}
