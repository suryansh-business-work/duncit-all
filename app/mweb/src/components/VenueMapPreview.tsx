import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { mapEmbedUrl, mapSearchUrl } from '../utils/mapEmbed';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  title?: string;
  parts: Array<string | null | undefined>;
  lat?: number | null;
  lng?: number | null;
}

/** An interactive map of the venue with an "Open in Maps" link under it.
 * Native twin: components/MapEmbed. */
export default function VenueMapPreview({ title, parts, lat, lng }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleText = title ?? t('mweb.venues.mapPreview');
  const query = lat != null && lng != null
    ? `${lat},${lng}`
    : parts.map((part) => part?.trim()).filter(Boolean).join(', ');
  if (!query) return null;

  const src = mapEmbedUrl(query);
  const mapUrl = mapSearchUrl(query);

  return (
    <Stack data-testid="venue-map-preview" spacing={0.5}>
      <Box
        data-testid="venue-map-preview-iframe"
        component="iframe"
        title={titleText}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        sx={{ width: '100%', height: { xs: 240, sm: 280 }, border: 0, borderRadius: '18px', display: 'block', bgcolor: 'action.hover' }}
      />
      <DuncitButton
        data-testid="venue-map-preview-open-link"
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
        size="small"
        endIcon={<OpenInNewIcon fontSize="small" />}
        sx={{ alignSelf: 'flex-end', minHeight: 32, px: 1 }}
      >
        {t('mweb.mapEmbed.openInMaps')}
      </DuncitButton>
    </Stack>
  );
}
