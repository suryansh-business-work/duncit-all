import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { usePortalT } from '../../../shared/i18n';
import { FormDialog } from '../FormDialog';
import { makeRecipientSchema, type RecipientValues } from './recipient.types';

interface Props {
  open: boolean;
  title: string;
  /** One line under the title saying what the send does. */
  message: string;
  /** Pre-filled address — normally the signed-in admin's own. */
  defaultTo: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (to: string) => Promise<void> | void;
  testId: string;
}

/**
 * "Send it where?" — the one dialog behind every test send in the console
 * (an SMTP entry, an email template), so the address rule lives once.
 */
export function RecipientDialog({ open, title, message, defaultTo, busy, onClose, onSubmit, testId }: Readonly<Props>) {
  const { t } = usePortalT();
  const schema = useMemo(() => makeRecipientSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<RecipientValues, unknown, RecipientValues>({
    defaultValues: { to: defaultTo },
    resolver: zodResolver(schema) as Resolver<RecipientValues, unknown, RecipientValues>,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) reset({ to: defaultTo });
  }, [open, defaultTo, reset]);

  return (
    <FormDialog
      open={open}
      title={title}
      onSubmit={handleSubmit((values) => onSubmit(values.to))}
      onClose={onClose}
      busy={busy}
      submitLabel={busy ? t('litePortal.common.sending') : t('litePortal.common.send')}
      testId={testId}
    >
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {message}
        </Typography>
        <RhfTextField
          control={control}
          name="to"
          type="email"
          label={t('litePortal.common.recipient')}
          hint={t('litePortal.common.recipientHint')}
          required
          autoComplete="email"
          disabled={busy}
          slotProps={{ htmlInput: { 'data-testid': `${testId}-to` } }}
        />
      </Stack>
    </FormDialog>
  );
}
