import { useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';
import { useLiteSettings } from '../../app/providers/LiteSettingsProvider';
import { EventThemeBackdrop } from '../../components/theme/EventThemeBackdrop';
import { LITE_CREATE_EVENT, LITE_MY_EVENTS, LITE_UPDATE_EVENT } from '../../graphql/events';
import { paths } from '../../lib/paths';
import { eventDefaults, limitsFrom, makeEventSchema, toEventInput, type EventFormValues } from './event.types';
import { CalendarAndVisibility, CoverField, DescriptionField, TitleInput } from './luma/FormHeadFields';
import { LocationField } from './luma/LocationField';
import { OptionsCard, editorFor, type OptionsEditor } from './luma/OptionsCard';
import { ThemePicker } from './luma/ThemePicker';
import { WhenBox } from './luma/WhenBox';
import { useEventOptions } from './useEventOptions';

/** The live preview of the chosen theme behind the whole form. */
function ThemePreview() {
  const [themeKey, accent] = useWatch<EventFormValues, ['theme_key', 'theme_accent']>({ name: ['theme_key', 'theme_accent'] });
  return <EventThemeBackdrop themeKey={themeKey} accent={accent} />;
}

/** Create an event (saved as a draft) or edit one, on one page; lands on the event page when saved. */
export function EventForm({ event }: Readonly<{ event: LiteEvent | null }>) {
  const { t } = useWebT();
  const { me } = useLiteSession();
  const settings = useLiteSettings();
  const navigate = useNavigate();
  const options = useEventOptions();
  const [editor, setEditor] = useState<OptionsEditor>(null);
  const schema = useMemo(() => makeEventSchema(t, limitsFrom(settings)), [t, settings]);
  const [createEvent] = useMutation(LITE_CREATE_EVENT, { refetchQueries: [LITE_MY_EVENTS] });
  const [updateEvent] = useMutation(LITE_UPDATE_EVENT);
  const form = useForm<EventFormValues>({ resolver: zodResolver(schema), defaultValues: eventDefaults(event, me, t('liteWeb.eventForm.defaultTicketName')) });

  const submit = form.handleSubmit(
    async (values) => {
      const input = toEventInput(values);
      try {
        if (event) {
          const { data } = await updateEvent({ variables: { id: event.id, input } });
          notifySuccess(t('liteWeb.eventForm.saved'));
          navigate(paths.event(data?.liteUpdateEvent.slug ?? event.slug));
        } else {
          const { data } = await createEvent({ variables: { input } });
          const created = data?.liteCreateEvent;
          notifySuccess(t('liteWeb.eventForm.created'));
          navigate(created ? paths.eventManage(created.slug) : paths.events);
        }
      } catch (error) {
        notifyError(parseApiError(error));
      }
    },
    (errors) => {
      setEditor(editorFor(errors));
      notifyError(t('liteWeb.eventForm.fixErrors'));
    },
  );

  return (
    <FormProvider {...form}>
      <ThemePreview />
      <Box
        component="form"
        onSubmit={submit}
        noValidate
        sx={{ position: 'relative', display: 'grid', gap: { xs: 3, md: 4 }, gridTemplateColumns: { xs: '1fr', md: '340px 1fr' }, alignItems: 'start' }}
        data-testid="event-form"
      >
        <Stack spacing={3} sx={{ position: { md: 'sticky' }, top: { md: 84 } }}>
          <CoverField />
          <ThemePicker />
        </Stack>
        <Stack spacing={2}>
          <CalendarAndVisibility calendars={options.calendars} />
          <TitleInput />
          <WhenBox />
          <LocationField cities={options.cities} />
          <DescriptionField />
          <OptionsCard categories={options.categories} cities={options.cities} editor={editor} setEditor={setEditor} />
          <DuncitButton type="submit" variant="contained" size="large" fullWidth loading={form.formState.isSubmitting} data-testid="event-form-save">
            {event ? t('lite.common.save') : t('liteWeb.eventForm.createEvent')}
          </DuncitButton>
        </Stack>
      </Box>
    </FormProvider>
  );
}
