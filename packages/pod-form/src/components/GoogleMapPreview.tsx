import { Box, Button, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  title?: string;
  parts: Array<string | null | undefined>;
  lat?: number | null;
  lng?: number | null;
}

/** Read-only Google Maps embed/link preview for a venue's address. */
export default function GoogleMapPreview({ title, parts, lat, lng }: Readonly<Props>) {
  const { t } = useTranslation();
  const heading = title ?? t('podForm.mapPreview.title');
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
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1
        }}>
        <Typography variant="subtitle2">{heading}</Typography>
        <Button size="small" href={mapUrl} target="_blank" rel="noreferrer" startIcon={<OpenInNewIcon />}>
          {t('podForm.mapPreview.openMap')}
        </Button>
      </Stack>
      {src ? (
        <Box
          component="iframe"
          title={heading}
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sx={{ width: '100%', height: 240, border: 0, borderRadius: 1, display: 'block' }}
        />
      ) : (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('podForm.mapPreview.keyMissing')}
        </Typography>
      )}
    </Box>
  );
}
