import { Box, Typography } from '@mui/material';

interface Props {
  locationName?: string | null;
  zoneName?: string | null;
}

// Embeds a Google Maps Place card based on the human-readable location name.
// Reads the API key from the build-time env var; renders nothing when the
// key is missing or the location is unknown so the card stays clean.
export default function PodLocationMap({ locationName, zoneName }: Props) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API as string | undefined;
  if (!apiKey || !locationName?.trim()) return null;

  const query = [zoneName, locationName].filter(Boolean).join(', ');
  const src =
    'https://www.google.com/maps/embed/v1/place?key=' +
    encodeURIComponent(apiKey) +
    '&q=' +
    encodeURIComponent(query);

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Map preview
      </Typography>
      <Box
        component="iframe"
        title="Pod location map"
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        sx={{
          width: '100%',
          height: 200,
          border: 0,
          borderRadius: 2,
          display: 'block',
          bgcolor: 'action.hover',
        }}
      />
    </Box>
  );
}
