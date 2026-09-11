import { Box, Stack } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { mapEmbedUrl, mapSearchUrl } from '../../utils/mapEmbed';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  locationName?: string | null;
  zoneName?: string | null;
  pincode?: string | null;
}

// Embeds a Google Maps Place card based on the human-readable location name.
// Renders nothing only when the location is unknown; the map itself falls back
// to a keyless embed when no API key is configured.
export default function PodLocationMap({ locationName, zoneName, pincode }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!locationName?.trim()) return null;

  const query = [zoneName, locationName, pincode, 'India'].filter(Boolean).join(', ');
  const src = mapEmbedUrl(query);
  const mapUrl = mapSearchUrl(query);

  return (
    <Stack spacing={0.5}>
      <Box
        component="iframe"
        title={t('mweb.podDetails.locationMap')}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        sx={{
          width: '100%',
          height: { xs: 240, sm: 280 },
          border: 0,
          borderRadius: '18px',
          display: 'block',
          bgcolor: 'action.hover',
        }}
      />
      <DuncitButton
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
        size="small"
        endIcon={<OpenInNewIcon fontSize="small" />}
        sx={{ alignSelf: 'flex-end', minHeight: 32, px: 1 }}
      >
        {t('mweb.podDetails.openInMaps')}
      </DuncitButton>
    </Stack>
  );
}
