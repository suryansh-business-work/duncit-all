import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import RhfTextField from '../../../forms/components/RhfTextField';
import { useTranslation } from '../../../i18n/useTranslation';
import {
  EVENT_REQUEST_NOTE_MAX,
  eventRequestDefaults,
  makeEventRequestSchema,
  type EventRequestValues,
} from './request-event.types';

interface Props {
  /** The dialog's submit button lives outside the form and targets it by id. */
  formId: string;
  onSubmit: (values: EventRequestValues) => Promise<void>;
}

/**
 * The optional note of the request-an-event dialog (RHF + Zod + MUI). A failed
 * send lands on the form's root error, under the field, with the localized
 * sentence rather than the raw server message.
 */
export default function RequestEventForm({ formId, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeEventRequestSchema(t), [t]);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EventRequestValues, unknown, EventRequestValues>({
    defaultValues: eventRequestDefaults,
    resolver: zodResolver(schema) as unknown as Resolver<EventRequestValues, unknown, EventRequestValues>,
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch {
      // The caller has already logged it with its context.
      setError('root', { message: t('publicPage.eventRequest.failed') });
    }
  });

  return (
    <Stack component="form" id={formId} noValidate onSubmit={submit} spacing={1.5} data-testid="request-event-form">
      <RhfTextField
        control={control}
        name="note"
        label={t('publicPage.eventRequest.noteLabel')}
        placeholder={t('publicPage.eventRequest.notePlaceholder')}
        multiline
        minRows={3}
        data-testid="request-event-form-note"
        slotProps={{ htmlInput: { maxLength: EVENT_REQUEST_NOTE_MAX, 'data-testid': 'request-event-form-note-input' } }}
      />
      {errors.root?.message && (
        <Alert severity="error" role="alert" data-testid="request-event-form-error">
          {errors.root.message}
        </Alert>
      )}
    </Stack>
  );
}
