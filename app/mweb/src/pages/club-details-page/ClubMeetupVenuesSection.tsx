import { useState } from 'react';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import NearMeIcon from '@mui/icons-material/NearMe';
import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { Link as RouterLink } from 'react-router';
import VenueMapPreview from '../../components/VenueMapPreview';
import { venueUrl } from '../../utils/seoUrls';
import { formatDistance, haversineKm } from '../../utils/distance';

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

export default function ClubMeetupVenuesSection({ venues }: Readonly<Props>) {
  const [selectedId, setSelectedId] = useState<string | null>(venues[0]?.id ?? null);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  if (venues.length === 0) return null;
  const selected = venues.find((venue) => venue.id === selectedId) ?? venues[0];

  const venueDistance = (venue: any): string | null => {
    if (!origin || typeof venue.lat !== 'number' || typeof venue.lng !== 'number') return null;
    return formatDistance(haversineKm(origin.lat, origin.lng, venue.lat, venue.lng));
  };

  const locateMe = () => {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
    );
  };

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 0.5
        }}>
        <Typography variant="h6" sx={{
          fontWeight: 700
        }}>
          We usually meet
        </Typography>
        {!origin && (
          <DuncitButton size="small" startIcon={<NearMeIcon fontSize="small" />} disabled={locating} onClick={locateMe}>
            {locating ? 'Locating…' : 'Show distance'}
          </DuncitButton>
        )}
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1 }}>
        {venues.map((venue) => {
          const distance = venueDistance(venue);
          return (
            <Card
              key={venue.id}
              variant="outlined"
              sx={{ minWidth: 220, flex: '0 0 auto', borderRadius: '16px' }}
            >
              <CardActionArea onClick={() => setSelectedId(venue.id)}>
                <CardContent>
                  <Typography variant="body2" noWrap sx={{
                    fontWeight: 700
                  }}>
                    {venue.venue_name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: "block"
                    }}>
                    {[venue.locality, venue.city].filter(Boolean).join(', ')}
                  </Typography>
                  {distance && (
                    <Chip size="small" icon={<NearMeIcon sx={{ fontSize: 14 }} />} label={distance} sx={{ mt: 0.5, height: 22, fontWeight: 600 }} />
                  )}
                </CardContent>
              </CardActionArea>
              <Box sx={{ px: 2, pb: 1.5 }}>
                <DuncitButton component={RouterLink} to={venueUrl(venue.id)} size="small" endIcon={<OpenInNewIcon fontSize="small" />} sx={{ px: 0 }}>
                  Venue details
                </DuncitButton>
              </Box>
            </Card>
          );
        })}
      </Stack>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mt: 1
        }}>
        {addressParts(selected).filter(Boolean).join(', ')}
      </Typography>
      <DuncitButton component={RouterLink} to={venueUrl(selected.id)} size="small" endIcon={<OpenInNewIcon fontSize="small" />} sx={{ mt: 1 }}>
        Open venue details
      </DuncitButton>
      <VenueMapPreview
        title={selected.venue_name}
        parts={addressParts(selected)}
        lat={selected.lat}
        lng={selected.lng}
      />
    </Box>
  );
}