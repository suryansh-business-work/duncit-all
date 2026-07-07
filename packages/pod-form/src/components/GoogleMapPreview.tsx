import { Box, Button, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

interface Props {
  title?: string;
  parts: Array<string | null | undefined>;
  lat?: number | null;
  lng?: number | null;
}

/** Read-only Google Maps embed/link preview for a venue's address. */
export default function GoogleMapPreview({ title = 'Map preview', parts, lat, lng }: Readonly<Props>) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAP_API as string | undefined;
  const query =
    lat != null && lng != null
      ? `${lat},${lng}`
      : parts
          .map((part) => part?.trim())
          .filter(Boolean)
          .join(', ');

  if (!query) return null;

  const encoded = encodeURIComponent(query);
  const src = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encoded}&zoom=15`
    : '';
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 1 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <Button size="small" href={mapUrl} target="_blank" rel="noreferrer" startIcon={<OpenInNewIcon />}>
          Open Map
        </Button>
      </Stack>
      {src ? (
        <Box
          component="iframe"
          title={title}
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sx={{ width: '100%', height: 240, border: 0, borderRadius: 1, display: 'block' }}
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          Add VITE_GOOGLE_MAP_API to preview the map here.
        </Typography>
      )}
    </Box>
  );
}
