import { useMemo, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlaceIcon from '@mui/icons-material/Place';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import VenueMapPreview from '../components/VenueMapPreview';

const PUBLIC_VENUES = gql`
  query PublicVenueDetails {
    publicVenues {
      id
      venue_name
      venue_type
      capacity
      description
      amenities
      facilities
      security
      cover_image_url
      gallery
      address_line1
      address_line2
      city
      state
      locality
      postal_code
      country
      lat
      lng
      tags
    }
  }
`;

function VenueChipsSection({ title, items }: Readonly<{ title: string; items?: string[] | null }>) {
  if (!items?.length) return null;
  return (
    <Stack spacing={1}>
      <Typography variant="h6" fontWeight={700}>{title}</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {items.map((item) => <Chip key={item} label={item} variant="outlined" />)}
      </Stack>
    </Stack>
  );
}

const addressParts = (venue: any) => [
  venue.address_line1,
  venue.address_line2,
  venue.locality,
  venue.city,
  venue.state,
  venue.postal_code,
  venue.country,
];

export default function VenueDetailsPage() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(PUBLIC_VENUES);
  const [snack, setSnack] = useState('');

  const venue = useMemo(
    () => data?.publicVenues?.find((item: any) => item.id === venueId),
    [data?.publicVenues, venueId],
  );
  const images = useMemo(() => {
    if (!venue) return [];
    return Array.from(new Set([venue.cover_image_url, ...(venue.gallery ?? [])].filter(Boolean)));
  }, [venue]);

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.href);
      setSnack('Venue link copied');
    } catch {
      setSnack('Copy is unavailable in this browser');
    }
  };

  if (loading && !data) {
    return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 6 }} />;
  }

  if (error || !venue) {
    return (
      <Stack spacing={2} sx={{ py: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ alignSelf: 'flex-start' }}>
          Back
        </Button>
        <Typography variant="h5" fontWeight={700}>Venue not found</Typography>
        <Typography color="text.secondary">
          This venue link may be unavailable or the venue may not be approved yet.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={3} sx={{ pb: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Back</Button>
        <Button startIcon={<ContentCopyIcon />} onClick={copyLink}>Copy link</Button>
      </Stack>

      <Box sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
        {images[0] ? (
          <Box component="img" src={images[0] as string} alt={venue.venue_name} sx={{ width: '100%', height: { xs: 260, sm: 360 }, objectFit: 'cover', display: 'block' }} />
        ) : (
          <Box sx={{ minHeight: 220, display: 'grid', placeItems: 'center', px: 3, bgcolor: 'action.hover' }}>
            <Typography variant="h4" fontWeight={800} textAlign="center">{venue.venue_name}</Typography>
          </Box>
        )}
      </Box>

      <Stack spacing={1}>
        <Typography variant="h4" fontWeight={800}>{venue.venue_name}</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={venue.venue_type} />
          <Chip label={`${venue.capacity} capacity`} />
          {venue.tags?.map((tag: string) => <Chip key={tag} label={tag} variant="outlined" />)}
        </Stack>
      </Stack>

      {venue.description && <Typography color="text.secondary">{venue.description}</Typography>}

      <Divider />

      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PlaceIcon color="primary" fontSize="small" />
          <Typography variant="h6" fontWeight={700}>Location</Typography>
        </Stack>
        <Typography color="text.secondary">
          {addressParts(venue).map((part) => part?.trim()).filter(Boolean).join(', ')}
        </Typography>
        <VenueMapPreview title={venue.venue_name} parts={addressParts(venue)} lat={venue.lat} lng={venue.lng} />
      </Stack>

      <VenueChipsSection title="Amenities" items={venue.amenities} />
      <VenueChipsSection title="Facilities" items={venue.facilities} />
      <VenueChipsSection title="Venue Security" items={venue.security} />

      {images.length > 1 ? (
        <Stack spacing={1}>
          <Typography variant="h6" fontWeight={700}>Images</Typography>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' } }}>
            {images.slice(1).map((url) => (
              <Box key={url as string} component="img" src={url as string} alt={venue.venue_name} sx={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 1 }} />
            ))}
          </Box>
        </Stack>
      ) : null}

      <Snackbar open={!!snack} autoHideDuration={2200} message={snack} onClose={() => setSnack('')} />
    </Stack>
  );
}
