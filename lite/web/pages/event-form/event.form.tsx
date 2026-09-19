import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import type { LiteEvent } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';
import { LITE_CREATE_EVENT, LITE_MY_EVENTS, LITE_UPDATE_EVENT } from '../../graphql/events';
import { paths } from '../../lib/paths';
import { eventDefaults, makeEventSchema, toEventInput, type EventFormValues } from './event.types';
import { BasicsSection } from './sections/BasicsSection';
import { PaymentSection } from './sections/PaymentSection';
import { QuestionsSection } from './sections/QuestionsSection';
import { SettingsSection } from './sections/SettingsSection';
import { TicketsSection } from './sections/TicketsSection';
import { WhenSection } from './sections/WhenSection';
import { WhereSection } from './sections/WhereSection';
import { useEventOptions } from './useEventOptions';

/** Create an event (saved as a draft) or edit one; lands on the event page when saved. */
export function EventForm({ event }: Readonly<{ event: LiteEvent | null }>) {
  const { t } = useWebT();
  const { me } = useLiteSession();
  const navigate = useNavigate();
  const options = useEventOptions();
  const schema = useMemo(() => makeEventSchema(t), [t]);
  const [createEvent] = useMutation(LITE_CREATE_EVENT, { refetchQueries: [LITE_MY_EVENTS] });
  const [updateEvent] = useMutation(LITE_UPDATE_EVENT);
  const { control, handleSubmit, formState } = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: eventDefaults(event, me, t('liteWeb.eventForm.defaultTicketName')),
  });

  const submit = handleSubmit(
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
          navigate(created ? paths.event(created.slug) : paths.hosting);
        }
      } catch (error) {
        notifyError(parseApiError(error));
      }
    },
    () => notifyError(t('liteWeb.eventForm.fixErrors')),
  );

  return (
    <Stack component="form" spacing={3} onSubmit={submit} noValidate data-testid="event-form">
      <BasicsSection control={control} />
      <WhenSection control={control} />
      <WhereSection control={control} cities={options.cities} />
      <TicketsSection control={control} />
      <QuestionsSection control={control} />
      <SettingsSection control={control} categories={options.categories} calendars={options.calendars} />
      <PaymentSection control={control} />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', position: 'sticky', bottom: { xs: 72, md: 16 }, py: 1 }}>
        <DuncitButton onClick={() => navigate(-1)} data-testid="event-form-cancel">
          {t('lite.common.cancel')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" size="large" loading={formState.isSubmitting} data-testid="event-form-save">
          {event ? t('lite.common.save') : t('liteWeb.eventForm.saveDraft')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
