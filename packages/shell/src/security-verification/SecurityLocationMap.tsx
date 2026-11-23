import { Box, Link, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useTranslation } from '../i18n/useTranslation';

export interface SecurityLocationMapProps {
  latitude: number;
  longitude: number;
  /** The radius, in metres, the browser said the fix could be off by. */
  accuracyMeters?: number | null;
  /** Accessible name of the map frame. */
  title: string;
}

/** Closer in for a precise fix, wider for a coarse one — the pin stays visible either way. */
function zoomFor(accuracyMeters?: number | null): number {
  if (accuracyMeters == null) return 15;
  if (accuracyMeters <= 50) return 17;
  if (accuracyMeters <= 500) return 15;
  if (accuracyMeters <= 5000) return 13;
  return 11;
}

/**
 * An interactive map pinned on a position — the person's current location on the
 * verification screen, and the recorded one in the Tech portal's detail view.
 *
 * Uses Google's keyless embed (the same contract as `mapEmbedUrl` in
 * @duncit/location, which the shell does not depend on): no key to configure,
 * and the frame can be panned and zoomed. The accuracy is written out beside
 * the map, because a pin looks more precise than a fix from a laptop's Wi-Fi is.
 */
export function SecurityLocationMap({ latitude, longitude, accuracyMeters, title }: Readonly<SecurityLocationMapProps>) {
  const { t } = useTranslation();
  const query = `${latitude},${longitude}`;
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoomFor(accuracyMeters)}&output=embed`;
  const openUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  return (
    <Stack spacing={0.75} data-testid="security-location-map">
      <Box
        component="iframe"
        title={title}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        sx={{ width: '100%', height: { xs: 220, sm: 280 }, border: 1, borderColor: 'divider', borderRadius: 1, display: 'block' }}
      />
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {accuracyMeters == null
            ? t('shell.securityVerification.map.coordinates', { vars: { lat: latitude.toFixed(5), lng: longitude.toFixed(5) } })
            : t('shell.securityVerification.map.coordinatesAccuracy', {
                vars: { lat: latitude.toFixed(5), lng: longitude.toFixed(5), meters: Math.round(accuracyMeters) },
              })}
        </Typography>
        <Link href={openUrl} target="_blank" rel="noopener noreferrer" variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          {t('shell.securityVerification.map.open')}
          <OpenInNewIcon fontSize="inherit" aria-hidden />
        </Link>
      </Stack>
    </Stack>
  );
}
