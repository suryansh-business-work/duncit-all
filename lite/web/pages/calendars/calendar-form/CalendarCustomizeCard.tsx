import { useId } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Box, Card, InputAdornment, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import { RhfTextField } from '@duncit/forms';
import { SITE_URL } from '../../../../shared/env';
import { useWebT } from '../../../../shared/i18n';
import { RhfSelect, type SelectOption } from '../../../components/RhfSelect';
import { AccentPicker } from '../../../components/theme/AccentPicker';
import { paths } from '../../../lib/paths';
import { CALENDAR_PLACES, type CalendarValues } from './calendar.types';

/** "lite.duncit.com/cal/": what goes before the calendar's own link. */
const URL_PREFIX = `${new URL(SITE_URL).host}${paths.calendar('')}`;
const PLACE_ICONS = { GLOBAL: PublicOutlinedIcon, CITY: LocationCityOutlinedIcon } as const;

function Label({ id, children }: Readonly<{ id?: string; children: string }>) {
  return (
    <Typography id={id} variant="body2" component="h3" sx={{ fontWeight: 700 }}>
      {children}
    </Typography>
  );
}

/** Tint, public link and where it happens: everywhere, or one city. */
export function CalendarCustomizeCard({ cities }: Readonly<{ cities: readonly SelectOption[] }>) {
  const { t } = useWebT();
  const headingId = useId();
  const placeId = useId();
  const { control } = useFormContext<CalendarValues>();
  const place = useWatch({ control, name: 'place' });
  return (
    <Card component="section" aria-labelledby={headingId} sx={{ p: { xs: 2, sm: 2.5 } }} data-testid="calendar-customize">
      <Typography id={headingId} variant="h6" component="h2" sx={{ fontWeight: 700, mb: 2 }}>
        {t('liteWeb.calendars.customization')}
      </Typography>
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Stack spacing={2.5}>
          <Stack spacing={1}>
            <Label>{t('liteWeb.calendars.tint')}</Label>
            <Controller
              control={control}
              name="tint"
              render={({ field }) => <AccentPicker value={field.value} onChange={field.onChange} label={t('liteWeb.calendars.tint')} testIdPrefix="calendar-tint" />}
            />
          </Stack>
          <RhfTextField
            control={control}
            name="slug"
            label={t('liteWeb.calendars.publicUrl')}
            hint={t('liteWeb.calendars.slugHint')}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">{URL_PREFIX}</InputAdornment> },
              htmlInput: { maxLength: 60, 'data-testid': 'calendar-slug' },
            }}
          />
        </Stack>
        <Stack spacing={1.25}>
          <Label id={placeId}>{t('liteWeb.calendars.location')}</Label>
          <Controller
            control={control}
            name="place"
            render={({ field }) => (
              <ToggleButtonGroup exclusive size="small" value={field.value} onChange={(_event, next: CalendarValues['place'] | null) => next && field.onChange(next)} aria-labelledby={placeId} sx={{ alignSelf: 'flex-start' }}>
                {CALENDAR_PLACES.map((value) => {
                  const Icon = PLACE_ICONS[value];
                  return (
                    <ToggleButton key={value} value={value} sx={{ px: 1.5, gap: 0.75 }} data-testid={`calendar-place-${value}`}>
                      <Icon fontSize="small" aria-hidden />
                      {t(`liteWeb.calendars.places.${value}`)}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
            )}
          />
          {place === 'CITY' ? (
            <RhfSelect control={control} name="city_slug" label={t('liteWeb.calendars.city')} options={cities} hint={t('liteWeb.calendars.cityHint')} testId="calendar-city" />
          ) : (
            <Typography variant="body2" color="text.secondary" data-testid="calendar-global-hint">
              {t('liteWeb.calendars.globalHint')}
            </Typography>
          )}
        </Stack>
      </Box>
    </Card>
  );
}
