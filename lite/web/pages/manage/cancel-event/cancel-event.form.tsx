import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../../shared/i18n';
import { LITE_CANCEL_EVENT } from '../../../graphql/events';
import { makeCancelEventSchema, type CancelEventValues } from './cancel-event.types';

interface CancelEventFormProps {
  eventId: string;
  onCancelled: () => void;
  onClose: () => void;
}

/** A reason, then the one irreversible click. */
export function CancelEventForm({ eventId, onCancelled, onClose }: Readonly<CancelEventFormProps>) {
  const { t } = useWebT();
  const schema = useMemo(() => makeCancelEventSchema(t), [t]);
  const [cancelEvent] = useMutation(LITE_CANCEL_EVENT);
  const { control, handleSubmit, formState } = useForm<CancelEventValues>({ resolver: zodResolver(schema), defaultValues: { reason: '' } });

  const submit = handleSubmit(async ({ reason }) => {
    try {
      await cancelEvent({ variables: { id: eventId, reason: reason || null } });
      notifySuccess(t('liteWeb.manage.cancel.done'));
      onCancelled();
      onClose();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  });

  return (
    <Stack component="form" spacing={2} onSubmit={submit} noValidate data-testid="cancel-event-form">
      <Alert severity="warning">{t('liteWeb.manage.cancel.warning')}</Alert>
      <RhfTextField
        control={control}
        name="reason"
        label={t('liteWeb.manage.cancel.reason')}
        hint={t('liteWeb.manage.cancel.reasonHint')}
        multiline
        minRows={2}
        slotProps={{ htmlInput: { maxLength: 300, 'data-testid': 'cancel-event-reason' } }}
      />
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton onClick={onClose} data-testid="cancel-event-keep">
          {t('liteWeb.manage.cancel.keep')}
        </DuncitButton>
        <DuncitButton type="submit" variant="contained" color="error" loading={formState.isSubmitting} data-testid="cancel-event-confirm">
          {t('liteWeb.manage.cancel.confirm')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
