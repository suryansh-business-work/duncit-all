import { Box, Button, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { locationMapQuery } from '../../utils/location-tree';

interface Props {
  city?: string | null;
  zoneName?: string | null;
  pincode?: string | null;
  country?: string | null;
}

// Interactive Google Maps embed (pan/zoom) centred on the selected place.
// Renders nothing when the API key is missing or no city is chosen, so the
// dialog stays clean — same graceful behaviour as the pod-details map.
export default function LocationMapPreview({ city, zoneName, pincode, country }: Props) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API as string | undefined;
  const query = locationMapQuery(city, zoneName, pincode, country);
  if (!apiKey || !query) return null;

  const src =
    'https://www.google.com/maps/embed/v1/place?key=' +
    encodeURIComponent(apiKey) +
    '&q=' +
    encodeURIComponent(query) +
    '&zoom=12';
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <Box sx={{ mt: 0.5, mb: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
          Map
        </Typography>
        <Button
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          size="small"
          endIcon={<OpenInNewIcon fontSize="small" />}
          sx={{ minHeight: 30, px: 1 }}
        >
          Open in Maps
        </Button>
      </Stack>
      <Box
        component="iframe"
        title="Selected location map"
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        sx={{
          width: '100%',
          height: 200,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          display: 'block',
          bgcolor: 'action.hover',
        }}
      />
    </Box>
  );
}
