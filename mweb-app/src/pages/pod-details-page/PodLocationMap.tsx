import { Box, Button, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface Props {
  locationName?: string | null;
  zoneName?: string | null;
  pincode?: string | null;
}

// Embeds a Google Maps Place card based on the human-readable location name.
// Reads the API key from the build-time env var; renders nothing when the
// key is missing or the location is unknown so the card stays clean.
export default function PodLocationMap({ locationName, zoneName, pincode }: Props) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API as string | undefined;
  if (!apiKey || !locationName?.trim()) return null;

  const query = [zoneName, locationName, pincode, 'India'].filter(Boolean).join(', ');
  const src =
    'https://www.google.com/maps/embed/v1/place?key=' +
    encodeURIComponent(apiKey) +
    '&q=' +
    encodeURIComponent(query) +
    '&zoom=15';
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography variant="caption" color="text.secondary">
          Map preview
        </Typography>
        <Button
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          size="small"
          endIcon={<OpenInNewIcon fontSize="small" />}
          sx={{ minHeight: 32, px: 1 }}
        >
          Open in Maps
        </Button>
      </Stack>
      <Box
        component="iframe"
        title="Pod location map"
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        sx={{
          width: '100%',
          height: { xs: 240, sm: 280 },
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
