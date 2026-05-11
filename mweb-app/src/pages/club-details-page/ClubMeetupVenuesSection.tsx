import { useState } from 'react';
import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import VenueMapPreview from '../../components/VenueMapPreview';

interface Props {
  venues: any[];
}

const addressParts = (venue: any) => [
  venue.venue_name,
  venue.address_line1,
  venue.address_line2,
  venue.locality,
  venue.city,
  venue.state,
  venue.postal_code,
  venue.country,
];

export default function ClubMeetupVenuesSection({ venues }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(venues[0]?.id ?? null);
  if (venues.length === 0) return null;
  const selected = venues.find((venue) => venue.id === selectedId) ?? venues[0];

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        We usually meet
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1 }}>
        {venues.map((venue) => (
          <Card
            key={venue.id}
            variant="outlined"
            sx={{ minWidth: 220, flex: '0 0 auto', borderRadius: 2 }}
          >
            <CardActionArea onClick={() => setSelectedId(venue.id)}>
              <CardContent>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {venue.venue_name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {[venue.locality, venue.city].filter(Boolean).join(', ')}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {addressParts(selected).filter(Boolean).join(', ')}
      </Typography>
      <VenueMapPreview
        title={selected.venue_name}
        parts={addressParts(selected)}
        lat={selected.lat}
        lng={selected.lng}
      />
    </Box>
  );
}