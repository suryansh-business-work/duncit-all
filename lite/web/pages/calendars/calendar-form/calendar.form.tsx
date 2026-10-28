import { useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import type { LiteCalendar } from '../../../../shared/graphql/documents';
import { useWebT } from '../../../../shared/i18n';
import { LITE_CREATE_CALENDAR, LITE_MY_CALENDARS, LITE_UPDATE_CALENDAR } from '../../../graphql/calendars';
import { LITE_CITIES } from '../../../graphql/discover';
import { paths } from '../../../lib/paths';
import { calendarDefaults, makeCalendarSchema, toCalendarInput, type CalendarValues } from './calendar.types';
import { CalendarCustomizeCard } from './CalendarCustomizeCard';
import { CalendarIdentityCard } from './CalendarIdentityCard';

/**
 * Create a calendar, or edit the one passed in, laid out like the page it
 * makes: cover, avatar, name and description, then its look and place.
 * Lands on its public page when saved.
 */
export function CalendarForm({ calendar }: Readonly<{ calendar: LiteCalendar | null }>) {
  const { t } = useWebT();
  const navigate = useNavigate();
  const schema = useMemo(() => makeCalendarSchema(t), [t]);
  const { data: cityData } = useQuery(LITE_CITIES);
  const cities = useMemo(() => (cityData?.liteCities ?? []).map((city) => ({ value: city.slug, label: city.name })), [cityData]);
  const [createCalendar] = useMutation(LITE_CREATE_CALENDAR, { refetchQueries: [LITE_MY_CALENDARS] });
  const [updateCalendar] = useMutation(LITE_UPDATE_CALENDAR);
  const methods = useForm<CalendarValues>({ resolver: zodResolver(schema), defaultValues: calendarDefaults(calendar) });

  const submit = methods.handleSubmit(async (values) => {
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
    <FormProvider {...methods}>
      <Stack component="form" spacing={3} onSubmit={submit} noValidate data-testid="calendar-form">
        <CalendarIdentityCard />
        <CalendarCustomizeCard cities={cities} />
        <Stack direction="row" spacing={1}>
          <DuncitButton type="submit" variant="contained" startIcon={<CheckCircleOutlineIcon />} loading={methods.formState.isSubmitting} data-testid="calendar-save">
            {calendar ? t('lite.common.save') : t('liteWeb.calendars.createCalendar')}
          </DuncitButton>
          <DuncitButton onClick={() => navigate(-1)} data-testid="calendar-cancel">
            {t('lite.common.cancel')}
          </DuncitButton>
        </Stack>
      </Stack>
    </FormProvider>
  );
}
