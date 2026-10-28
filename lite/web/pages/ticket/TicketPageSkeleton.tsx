import { Box, Card, CardContent, Stack } from '@mui/material';
import { EventCardSkeleton, Shape, SkeletonFrame, TextLine } from '../../components/skeletons';

/** A ticket while it loads: title and date, the check-in QR and the details, the event card beside them. */
export function TicketPageSkeleton() {
  return (
    <SkeletonFrame testId="ticket-skeleton">
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <TextLine width="55%" typo="h4" />
          <TextLine width="35%" />
        </Stack>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 7fr) minmax(0, 5fr)' }, alignItems: 'start' }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Shape width={200} height={200} radius={2} />
                  <TextLine width={140} typo="h4" />
                </Stack>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <TextLine width="30%" typo="h5" />
                  <TextLine width="80%" />
                  <TextLine width="65%" />
                  <TextLine width="50%" />
                </Stack>
              </CardContent>
            </Card>
          </Stack>
          <Stack spacing={1}>
            <TextLine width="30%" typo="h5" />
            <EventCardSkeleton />
          </Stack>
        </Box>
      </Stack>
    </SkeletonFrame>
  );
}
