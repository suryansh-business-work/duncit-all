import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Button, Stack, Typography } from '@mui/material';
import { mapEmbedUrl, mapSearchUrl } from '../utils/mapEmbed';

interface Props {
  title?: string;
  parts: Array<string | null | undefined>;
  lat?: number | null;
  lng?: number | null;
}

export default function VenueMapPreview({ title = 'Map preview', parts, lat, lng }: Props) {
  const query = lat != null && lng != null
    ? `${lat},${lng}`
    : parts.map((part) => part?.trim()).filter(Boolean).join(', ');
  if (!query) return null;

  const src = mapEmbedUrl(query);
  const mapUrl = mapSearchUrl(query);

  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography variant="caption" color="text.secondary">Map preview</Typography>
        <Button href={mapUrl} target="_blank" rel="noreferrer" size="small" endIcon={<OpenInNewIcon fontSize="small" />}>
          Open in Maps
        </Button>
      </Stack>
      <Box
        component="iframe"
        title={title}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        sx={{ width: '100%', height: { xs: 240, sm: 280 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
      />
    </Box>
  );
}