import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { usePortalT } from '../../../../shared/i18n';
import { FormDialog } from '../../../components/FormDialog';
import type { LiteAdminEventRow } from '../../../graphql/events';
import { makeCancelEventSchema, type CancelEventValues } from './cancel-event.types';

interface Props {
  event: LiteAdminEventRow | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

/** The admin's cancel: names the event, asks for a reason, then confirms. */
export function CancelEventDialog({ event, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = usePortalT();
  const schema = useMemo(() => makeCancelEventSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<CancelEventValues, unknown, CancelEventValues>({
    defaultValues: { reason: '' },
    resolver: zodResolver(schema) as Resolver<CancelEventValues, unknown, CancelEventValues>,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (event) reset({ reason: '' });
  }, [event, reset]);

  return (
    <FormDialog
      open={Boolean(event)}
      title={t('litePortal.events.cancelTitle')}
      onSubmit={handleSubmit((values) => onSubmit(values.reason))}
      onClose={onClose}
      busy={busy}
      submitLabel={t('litePortal.events.cancelConfirm')}
      testId="cancel-event-dialog"
    >
      <Stack spacing={1.5}>
        <Typography variant="body2">{t('litePortal.events.cancelMessage', { vars: { title: event?.title ?? '' } })}</Typography>
        <RhfTextField
          control={control}
          name="reason"
          label={t('litePortal.events.cancelReason')}
          hint={t('litePortal.events.cancelReasonHint')}
          multiline
          minRows={3}
          disabled={busy}
          slotProps={{ htmlInput: { 'data-testid': 'cancel-event-reason' } }}
        />
      </Stack>
    </FormDialog>
  );
}
