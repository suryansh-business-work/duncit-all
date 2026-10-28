import { Box, Card, CardContent, Stack } from '@mui/material';
import { LITE_RADII } from '../../../shared/tokens';
import { Dot, Shape, SkeletonFrame, TextLine, slots } from '../../components/skeletons';

const PILL = `${LITE_RADII.pill}px`;
const CONTROL = `${LITE_RADII.control}px`;

/** An icon tile beside two lines: the When and Where blocks. */
function IconBlock() {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Shape width={44} height={44} radius={CONTROL} />
      <Stack sx={{ flexGrow: 1 }}>
        <TextLine width="45%" />
        <TextLine width="65%" typo="body2" />
      </Stack>
    </Stack>
  );
}

/** The event page while it loads: cover, title and the detail cards on the left, the registration card on the right. */
export function EventPageSkeleton() {
  return (
    <SkeletonFrame testId="event-page-skeleton">
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 7fr) minmax(0, 5fr)' }, alignItems: 'start' }}>
        <Stack spacing={3}>
          <Stack spacing={1.5}>
            <Shape ratio="1200 / 630" radius={4} />
            <Stack direction="row" spacing={1}>
              <Shape width={84} height={26} radius={PILL} />
              <Shape width={64} height={26} radius={PILL} />
            </Stack>
            <TextLine width="80%" typo="h1" />
          </Stack>
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <IconBlock />
                <IconBlock />
                <Shape height={180} radius={3} />
                <Stack direction="row" spacing={0.5}>
                  {slots('guest', 5).map((guest) => (
                    <Dot key={guest} size={32} />
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', pb: 1 }}>
                  <Dot size={40} />
                  <TextLine width="35%" />
                </Stack>
                <TextLine />
                <TextLine width="92%" />
                <TextLine width="70%" />
              </Stack>
            </CardContent>
          </Card>
        </Stack>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <TextLine width="50%" typo="h4" />
              {slots('ticket', 2).map((ticket) => (
                <Shape key={ticket} height={64} radius={CONTROL} />
              ))}
              <Shape height={44} radius={CONTROL} />
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </SkeletonFrame>
  );
}
