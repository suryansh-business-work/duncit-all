import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, useConfirm } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../../shared/i18n';
import { LITE_SEND_EVENT_UPDATE } from '../../../graphql/manage';
import { makeUpdateSchema, type UpdateValues } from './update.types';

interface UpdateFormProps {
  eventId: string;
  goingCount: number;
}

/** Subject and message; confirms before mailing, then says how many it reached. */
export function UpdateForm({ eventId, goingCount }: Readonly<UpdateFormProps>) {
  const { t } = useWebT();
  const confirm = useConfirm();
  const [sentTo, setSentTo] = useState<number | null>(null);
  const schema = useMemo(() => makeUpdateSchema(t), [t]);
  const [sendUpdate] = useMutation(LITE_SEND_EVENT_UPDATE);
  const { control, handleSubmit, formState, reset } = useForm<UpdateValues>({ resolver: zodResolver(schema), defaultValues: { subject: '', body: '' } });

  const submit = handleSubmit(async ({ subject, body }) => {
    const ok = await confirm({
      title: t('liteWeb.manage.updates.confirmTitle'),
      message: t('liteWeb.manage.updates.confirmBody', { count: goingCount }),
      confirmLabel: t('liteWeb.manage.updates.send'),
    });
    if (!ok) return;
    try {
      const { data } = await sendUpdate({ variables: { event_id: eventId, subject, body } });
      setSentTo(data?.liteSendEventUpdate.sent ?? 0);
      reset({ subject: '', body: '' });
    } catch (error) {
      notifyError(parseApiError(error));
    }
  });

  return (
    <Stack component="form" spacing={2} onSubmit={submit} noValidate data-testid="update-form">
      <RhfTextField control={control} name="subject" label={t('liteWeb.manage.updates.subject')} hint={t('liteWeb.manage.updates.subjectHint')} slotProps={{ htmlInput: { maxLength: 120, 'data-testid': 'update-subject' } }} />
      <RhfTextField
        control={control}
        name="body"
        label={t('liteWeb.manage.updates.message')}
        hint={t('liteWeb.manage.updates.messageHint')}
        multiline
        minRows={6}
        slotProps={{ htmlInput: { maxLength: 5000, 'data-testid': 'update-body' } }}
      />
      <Stack aria-live="polite">
        {sentTo === null ? null : (
          <Alert severity="success" data-testid="update-sent">
            {t('liteWeb.manage.updates.sent', { count: sentTo })}
          </Alert>
        )}
      </Stack>
      <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting} sx={{ alignSelf: 'flex-end' }} data-testid="update-send">
        {t('liteWeb.manage.updates.send')}
      </DuncitButton>
    </Stack>
  );
}
