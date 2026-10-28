import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { RhfTextField } from '@duncit/forms';
import { useWebT } from '../../../../shared/i18n';
import { useLiteSettings } from '../../../app/providers/LiteSettingsProvider';
import { EventMap } from '../../../components/EventMap';
import type { SelectOption } from '../../../components/RhfSelect';
import { mapsLink, type PickedPlace } from '../../../lib/googleMaps';
import type { EventFormValues } from '../event.types';
import { PlaceSearch } from './PlaceSearch';
import { FieldPanel } from './FieldPanel';

/** The venue, the address and a Google Maps link to paste: filled by a search pick, or typed by hand. */
const placeKey = (venue: string, address: string, mapUrl: string): string => [venue, address, mapUrl].join('|');

/** The venue / address / map-link boxes, always shown: a search pick fills them, and a host can type or paste instead. */
function ManualPlace() {
  const { t } = useWebT();
  const { control } = useFormContext<EventFormValues>();
  return (
    <Stack spacing={1.5}>
      <RhfTextField control={control} name="venue_name" label={t('liteWeb.eventForm.venue')} hint={t('liteWeb.eventForm.venueHint')} slotProps={{ htmlInput: { maxLength: 120, 'data-testid': 'event-venue' } }} />
      <RhfTextField control={control} name="address" label={t('liteWeb.eventForm.address')} hint={t('liteWeb.eventForm.addressHint')} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 300, 'data-testid': 'event-address' } }} />
      <RhfTextField control={control} name="map_url" label={t('liteWeb.eventForm.mapUrl')} hint={t('liteWeb.eventForm.mapUrlHint')} slotProps={{ htmlInput: { inputMode: 'url', 'data-testid': 'event-map-url' } }} />
    </Stack>
  );
}

/** In person (Google place search and the typed / pasted boxes, together, with the map) or online (the join link). */
export function LocationField({ cities }: Readonly<{ cities: readonly SelectOption[] }>) {
  const { t } = useWebT();
  const { maps_api_key: mapsKey } = useLiteSettings();
  const { control, setValue } = useFormContext<EventFormValues>();
  const [locationType, venue, address, mapUrl, placeId, lat, lng] = useWatch({ control, name: ['location_type', 'venue_name', 'address', 'map_url', 'place_id', 'lat', 'lng'] });
  const [unavailable, setUnavailable] = useState(false);
  const fallBack = useCallback(() => setUnavailable(true), []);
  /** What the verified pin was picked as; a hand edit away from it drops the pin, so the map follows the new words. */
  const pinnedAs = useRef(placeKey(venue, address, mapUrl));

  useEffect(() => {
    if (lat == null || placeKey(venue, address, mapUrl) === pinnedAs.current) return;
    setValue('place_id', '', { shouldDirty: true });
    setValue('lat', null, { shouldDirty: true });
    setValue('lng', null, { shouldDirty: true });
  }, [venue, address, mapUrl, lat, setValue]);

  const pick = (place: PickedPlace) => {
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    const link = mapsLink(place);
    pinnedAs.current = placeKey(place.name, place.address, link);
    setValue('venue_name', place.name, opts);
    setValue('address', place.address, opts);
    setValue('place_id', place.placeId, opts);
    setValue('lat', place.lat, opts);
    setValue('lng', place.lng, opts);
    setValue('map_url', link, opts);
    const city = cities.find((option) => option.label.toLowerCase() === place.city.toLowerCase());
    if (city) setValue('city_slug', city.value, opts);
  };

  const inPerson = locationType === 'IN_PERSON';
  return (
    <FieldPanel icon={<PlaceOutlinedIcon fontSize="small" />} title={t('liteWeb.eventForm.where')} testId="event-location">
      <Stack spacing={1.5}>
        <Controller
          control={control}
          name="location_type"
          render={({ field }) => (
            <ToggleButtonGroup exclusive size="small" value={field.value} aria-label={t('liteWeb.eventForm.locationType')} onChange={(_event, next: EventFormValues['location_type'] | null) => next && field.onChange(next)}>
              <ToggleButton value="IN_PERSON" data-testid="event-in-person">
                {t('lite.common.inPerson')}
              </ToggleButton>
              <ToggleButton value="VIRTUAL" data-testid="event-virtual">
                {t('lite.common.online')}
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        />
        {inPerson ? null : (
          <RhfTextField control={control} name="virtual_link" label={t('liteWeb.eventForm.virtualLink')} hint={t('liteWeb.eventForm.virtualLinkHint')} slotProps={{ htmlInput: { inputMode: 'url', 'data-testid': 'event-virtual-link' } }} />
        )}
        {inPerson && mapsKey && !unavailable ? <PlaceSearch apiKey={mapsKey} onPick={pick} onUnavailable={fallBack} /> : null}
        {inPerson && unavailable ? (
          <Typography variant="body2" color="text.secondary" role="status" data-testid="place-search-unavailable">
            {t('liteWeb.eventForm.placeUnavailable')}
          </Typography>
        ) : null}
        {inPerson ? <ManualPlace /> : null}
        {/* The place on the map as guests will see it: the picked pin, else the pasted link, else the typed address. */}
        {inPerson ? <EventMap event={{ location_type: 'IN_PERSON', place_id: placeId || null, lat, lng, venue_name: venue || null, address: address || null, map_url: mapUrl || null }} /> : null}
      </Stack>
    </FieldPanel>
  );
}
