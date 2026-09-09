import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import type { MeetingCounts, MeetingKind } from './onboardingStats';

const KIND_LABEL: Record<MeetingKind, string> = {
  VENUE: 'Venue',
  HOST: 'Host',
  ECOMM: 'E-Commerce Brand',
};

// Meeting counts per kind. Each card opens that kind's Meeting Schedule
// filtered to the pending "Requested" requests — the parent supplies the
// navigation, and the kinds to draw, since e-commerce sits behind a system
// flag. A CSS grid keeps the cards flush-left with the headings.
export default function MeetingScheduleStrip({
  counts,
  kinds,
  onOpen,
}: Readonly<{
  counts: MeetingCounts;
  kinds: MeetingKind[];
  onOpen: (kind: MeetingKind) => void;
}>) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: `repeat(${kinds.length}, 1fr)` },
      }}
    >
      {kinds.map((kind) => (
        <Card key={kind} variant="outlined" sx={{ height: '100%' }}>
          <CardActionArea onClick={() => onOpen(kind)} sx={{ height: '100%' }}>
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  mb: 0.5
                }}>
                <EventIcon fontSize="small" color="primary" />
                <Typography
                  variant="overline"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 800
                  }}>
                  {KIND_LABEL[kind]} meetings
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{
                fontWeight: 900
              }}>
                {counts[kind]}
              </Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                View requests
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}
