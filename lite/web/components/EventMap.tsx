import { Box } from '@mui/material';
import type { LiteEvent } from '../../shared/graphql/documents';
import { useWebT } from '../../shared/i18n';
import { LITE_RADII } from '../../shared/tokens';
import { useLiteSettings } from '../app/providers/LiteSettingsProvider';
import { mapEmbedSrc } from '../lib/googleMaps';

type MappedEvent = Pick<LiteEvent, 'location_type' | 'place_id' | 'lat' | 'lng' | 'venue_name' | 'address' | 'map_url'>;

/**
 * The venue on a Google map, for any in-person event with a place: the pin
 * picked from search, else the Google Maps link the host pasted, else the
 * typed venue and address. With no Maps key in the console it still draws,
 * through Google's keyless embed. Used on the event page and in the event form.
 */
export function EventMap({ event }: Readonly<{ event: MappedEvent }>) {
  const { t } = useWebT();
  const { maps_api_key: apiKey } = useLiteSettings();
  if (event.location_type !== 'IN_PERSON') return null;
  const src = mapEmbedSrc(apiKey, { placeId: event.place_id, lat: event.lat, lng: event.lng, mapUrl: event.map_url, venue: event.venue_name, address: event.address });
  if (!src) return null;
  const place = event.venue_name || event.address || '';
  return (
    <Box sx={{ borderRadius: `${LITE_RADII.card}px`, overflow: 'hidden', border: 1, borderColor: 'divider', aspectRatio: { xs: '4 / 3', sm: '16 / 9' } }} data-testid="event-map">
      <Box
        component="iframe"
        title={t('liteWeb.event.mapTitle', { vars: { place } })}
        src={src}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        sx={{ border: 0, width: '100%', height: '100%', display: 'block' }}
      />
    </Box>
  );
}
