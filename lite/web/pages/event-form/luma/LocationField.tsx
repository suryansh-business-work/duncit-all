import { useCallback, useState } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Box, Link, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
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

/** The manual venue / address / map-link boxes, for a host without a Maps key or who prefers typing. */
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

/** In person (Google place search, or typed by hand) or online (the join link). */
export function LocationField({ cities }: Readonly<{ cities: readonly SelectOption[] }>) {
  const { t } = useWebT();
  const { maps_api_key: mapsKey } = useLiteSettings();
  const { control, setValue } = useFormContext<EventFormValues>();
  const [locationType, venue, address, placeId, lat, lng] = useWatch({ control, name: ['location_type', 'venue_name', 'address', 'place_id', 'lat', 'lng'] });
  const [manual, setManual] = useState(!mapsKey);
  const [unavailable, setUnavailable] = useState(false);
  const fallBack = useCallback(() => {
    setUnavailable(true);
    setManual(true);
  }, []);

  const pick = (place: PickedPlace) => {
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    setValue('venue_name', place.name, opts);
    setValue('address', place.address, opts);
    setValue('place_id', place.placeId, opts);
    setValue('lat', place.lat, opts);
    setValue('lng', place.lng, opts);
    setValue('map_url', mapsLink(place), opts);
    const city = cities.find((option) => option.label.toLowerCase() === place.city.toLowerCase());
    if (city) setValue('city_slug', city.value, opts);
  };

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
        {locationType === 'VIRTUAL' ? (
          <RhfTextField control={control} name="virtual_link" label={t('liteWeb.eventForm.virtualLink')} hint={t('liteWeb.eventForm.virtualLinkHint')} slotProps={{ htmlInput: { inputMode: 'url', 'data-testid': 'event-virtual-link' } }} />
        ) : null}
        {locationType === 'IN_PERSON' && !manual ? (
          <Stack spacing={1}>
            <PlaceSearch apiKey={mapsKey} onPick={pick} onUnavailable={fallBack} />
            {venue || address ? (
              <Box sx={{ px: 1 }} data-testid="event-place-picked">
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {venue}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {address}
                </Typography>
              </Box>
            ) : null}
            {/* The picked place on the map, as guests will see it on the event page. */}
            <EventMap event={{ location_type: 'IN_PERSON', place_id: placeId || null, lat, lng, venue_name: venue || null, address: address || null }} />
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => {
                // A typed address has no verified pin; keep the old one and the map would point elsewhere.
                setValue('place_id', '');
                setValue('lat', null);
                setValue('lng', null);
                setManual(true);
              }}
              sx={{ alignSelf: 'flex-start' }}
              data-testid="event-place-manual"
            >
              {t('liteWeb.eventForm.placeManual')}
            </Link>
          </Stack>
        ) : null}
        {locationType === 'IN_PERSON' && unavailable ? (
          <Typography variant="body2" color="text.secondary" role="status" data-testid="place-search-unavailable">
            {t('liteWeb.eventForm.placeUnavailable')}
          </Typography>
        ) : null}
        {locationType === 'IN_PERSON' && manual ? <ManualPlace /> : null}
      </Stack>
    </FieldPanel>
  );
}
