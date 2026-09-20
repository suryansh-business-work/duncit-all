import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import { makeOrderNoteSchema, NOTE_MAX, type OrderNoteValues } from './order-note.types';

interface OrderNoteFormProps {
  busy: boolean;
  onSubmit: (text: string) => Promise<boolean>;
}

/** Add a private note to an order — only operators read these. */
export default function OrderNoteForm({ busy, onSubmit }: Readonly<OrderNoteFormProps>) {
  const { t, form } = useSchemaForm<OrderNoteValues>(makeOrderNoteSchema, { text: '' });
  const { control, handleSubmit, reset } = form;
  const submit = handleSubmit(async (values) => {
    if (await onSubmit(values.text)) reset({ text: '' });
  });
  return (
    <form noValidate onSubmit={submit} aria-label={t('ecommPortal.orders.addNote')}>
      <Stack spacing={1}>
        <RhfTextField
          control={control}
          name="text"
          label={t('ecommPortal.orders.newNote')}
          required
          multiline
          minRows={2}
          hint={t('ecommPortal.orders.notePrivate', { vars: { max: NOTE_MAX } })}
        />
        <DuncitButton type="submit" variant="outlined" loading={busy} sx={{ alignSelf: 'flex-start' }}>
          {t('ecommPortal.orders.addNote')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
