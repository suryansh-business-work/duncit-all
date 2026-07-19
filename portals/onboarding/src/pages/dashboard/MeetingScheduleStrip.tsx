import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { MEETING_KINDS, type MeetingCounts, type MeetingKind } from './onboardingStats';

const KIND_LABEL: Record<MeetingKind, string> = {
  VENUE: 'Venue',
  HOST: 'Host',
  ECOMM: 'Seller',
};

// Venue / Host / Seller meeting counts. Each card opens that kind's Meeting
// Schedule filtered to the pending "Requested" requests (the parent supplies
// the navigation). A CSS grid keeps the cards flush-left with the headings.
export default function MeetingScheduleStrip({
  counts,
  onOpen,
}: Readonly<{ counts: MeetingCounts; onOpen: (kind: MeetingKind) => void }>) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
      }}
    >
      {MEETING_KINDS.map((kind) => (
        <Card key={kind} variant="outlined" sx={{ height: '100%' }}>
          <CardActionArea onClick={() => onOpen(kind)} sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <EventIcon fontSize="small" color="primary" />
                <Typography variant="overline" color="text.secondary" fontWeight={800}>
                  {KIND_LABEL[kind]} meetings
                </Typography>
              </Stack>
              <Typography variant="h4" fontWeight={900}>
                {counts[kind]}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                View requests
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}
