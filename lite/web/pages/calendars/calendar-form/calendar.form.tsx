import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import type { LiteCalendar } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { CoverUploader } from '../../../components/CoverUploader';
import { RhfSelect } from '../../../components/RhfSelect';
import { LITE_CREATE_CALENDAR, LITE_MY_CALENDARS, LITE_UPDATE_CALENDAR } from '../../../graphql/calendars';
import { LITE_CITIES } from '../../../graphql/discover';
import { paths } from '../../../lib/paths';
import { calendarDefaults, makeCalendarSchema, toCalendarInput, type CalendarValues } from './calendar.types';

/** Create a calendar, or edit the one passed in; lands on its public page when saved. */
export function CalendarForm({ calendar }: Readonly<{ calendar: LiteCalendar | null }>) {
  const { t } = useWebT();
  const navigate = useNavigate();
  const schema = useMemo(() => makeCalendarSchema(t), [t]);
  const { data: cityData } = useQuery(LITE_CITIES);
  const cities = useMemo(() => (cityData?.liteCities ?? []).map((city) => ({ value: city.slug, label: city.name })), [cityData]);
  const [createCalendar] = useMutation(LITE_CREATE_CALENDAR, { refetchQueries: [LITE_MY_CALENDARS] });
  const [updateCalendar] = useMutation(LITE_UPDATE_CALENDAR);
  const { control, handleSubmit, formState } = useForm<CalendarValues>({ resolver: zodResolver(schema), defaultValues: calendarDefaults(calendar) });

  const submit = handleSubmit(async (values) => {
    const input = toCalendarInput(values);
    try {
      const slug = calendar
        ? (await updateCalendar({ variables: { id: calendar.id, input } })).data?.liteUpdateCalendar.slug
        : (await createCalendar({ variables: { input } })).data?.liteCreateCalendar.slug;
      notifySuccess(t('liteWeb.calendars.saved'));
      navigate(slug ? paths.calendar(slug) : paths.calendars);
    } catch (error) {
      notifyError(parseApiError(error));
    }
  });

  return (
    <Stack component="form" spacing={2} onSubmit={submit} noValidate data-testid="calendar-form">
      <RhfTextField control={control} name="name" label={t('liteWeb.calendars.name')} hint={t('liteWeb.calendars.nameHint')} slotProps={{ htmlInput: { maxLength: 80, 'data-testid': 'calendar-name' } }} />
      <RhfTextField control={control} name="slug" label={t('liteWeb.calendars.slug')} hint={t('liteWeb.calendars.slugHint')} slotProps={{ htmlInput: { maxLength: 60, 'data-testid': 'calendar-slug' } }} />
      <RhfTextField
        control={control}
        name="description"
        label={t('liteWeb.calendars.description')}
        hint={t('liteWeb.calendars.descriptionHint')}
        multiline
        minRows={3}
        slotProps={{ htmlInput: { maxLength: 1000, 'data-testid': 'calendar-description' } }}
      />
      <RhfSelect control={control} name="city_slug" label={t('liteWeb.calendars.city')} options={cities} emptyLabel={t('liteWeb.calendars.noCity')} hint={t('liteWeb.calendars.cityHint')} testId="calendar-city" />
      <Controller
        control={control}
        name="avatar_url"
        render={({ field, fieldState }) => (
          <CoverUploader label={t('liteWeb.calendars.avatar')} value={field.value} onChange={field.onChange} shape="avatar" error={fieldState.error?.message} testId="calendar-avatar" />
        )}
      />
      <Controller
        control={control}
        name="cover_url"
        render={({ field, fieldState }) => (
          <CoverUploader label={t('liteWeb.calendars.cover')} value={field.value} onChange={field.onChange} error={fieldState.error?.message} testId="calendar-cover" />
        )}
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={() => navigate(-1)} data-testid="calendar-cancel">
          {t('lite.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting} data-testid="calendar-save">
          {t('lite.common.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
