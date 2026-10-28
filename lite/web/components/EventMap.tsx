import { Box } from '@mui/material';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII } from '../../../shared/tokens';
import { useLiteSettings } from '../../app/providers/LiteSettingsProvider';
import { embedMapUrl } from '../../lib/googleMaps';

/** The venue on a Google map, when the host picked the place from search and the console has a Maps key. */
export function EventMap({ event }: Readonly<{ event: Pick<LiteEvent, 'location_type' | 'place_id' | 'lat' | 'lng' | 'venue_name' | 'address'> }>) {
  const { t } = useWebT();
  const { maps_api_key: apiKey } = useLiteSettings();
  if (!apiKey || event.location_type !== 'IN_PERSON' || event.lat == null || event.lng == null) return null;
  const place = event.venue_name ?? event.address ?? '';
  return (
    <Box sx={{ borderRadius: `${LITE_RADII.card}px`, overflow: 'hidden', border: 1, borderColor: 'divider', aspectRatio: { xs: '4 / 3', sm: '16 / 9' } }} data-testid="event-map">
      <Box
        component="iframe"
        title={t('liteWeb.event.mapTitle', { vars: { place } })}
        src={embedMapUrl(apiKey, { placeId: event.place_id, lat: event.lat, lng: event.lng })}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        sx={{ border: 0, width: '100%', height: '100%', display: 'block' }}
      />
    </Box>
  );
}
