import { Controller, useWatch, type Control } from 'react-hook-form';
import { Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useWebT } from '../../../../shared/i18n';
import { RhfSelect, type SelectOption } from '../../../components/RhfSelect';
import type { EventFormValues } from '../event.types';

interface WhereSectionProps {
  control: Control<EventFormValues>;
  cities: readonly SelectOption[];
}

/** In person (venue, address, map, city) or online (the join link). */
export function WhereSection({ control, cities }: Readonly<WhereSectionProps>) {
  const { t } = useWebT();
  const locationType = useWatch({ control, name: 'location_type' });
  return (
    <SectionCard title={t('liteWeb.eventForm.where')} subtitle={t('liteWeb.eventForm.whereHint')}>
      <Stack spacing={2}>
        <Controller
          control={control}
          name="location_type"
          render={({ field }) => (
            <ToggleButtonGroup
              exclusive
              value={field.value}
              aria-label={t('liteWeb.eventForm.locationType')}
              onChange={(_event, next: EventFormValues['location_type'] | null) => {
                if (next) field.onChange(next);
              }}
            >
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
        ) : (
          <>
            <RhfTextField control={control} name="venue_name" label={t('liteWeb.eventForm.venue')} hint={t('liteWeb.eventForm.venueHint')} slotProps={{ htmlInput: { maxLength: 120, 'data-testid': 'event-venue' } }} />
            <RhfTextField control={control} name="address" label={t('liteWeb.eventForm.address')} hint={t('liteWeb.eventForm.addressHint')} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 300, 'data-testid': 'event-address' } }} />
            <RhfTextField control={control} name="map_url" label={t('liteWeb.eventForm.mapUrl')} hint={t('liteWeb.eventForm.mapUrlHint')} slotProps={{ htmlInput: { inputMode: 'url', 'data-testid': 'event-map-url' } }} />
          </>
        )}
        <RhfSelect control={control} name="city_slug" label={t('liteWeb.eventForm.city')} options={cities} emptyLabel={t('liteWeb.eventForm.noCity')} hint={t('liteWeb.eventForm.cityHint')} testId="event-city" />
      </Stack>
    </SectionCard>
  );
}
