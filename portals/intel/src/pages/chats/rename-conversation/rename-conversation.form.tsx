import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { makeRenameSchema, TITLE_MAX, type RenameOutput, type RenameValues } from './rename-conversation.types';

export interface RenameConversationFormProps {
  open: boolean;
  title: string;
  saving: boolean;
  errorMessage: string | null;
  onSubmit: (title: string) => void;
  onClose: () => void;
}

/** The rename dialog (React Hook Form + Zod). */
export default function RenameConversationForm({ open, title, saving, errorMessage, onSubmit, onClose }: Readonly<RenameConversationFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeRenameSchema(t), [t]);
  const { control, handleSubmit } = useForm<RenameValues, unknown, RenameOutput>({
    defaultValues: { title },
    values: { title },
    resolver: zodResolver(schema) as Resolver<RenameValues, unknown, RenameOutput>,
    mode: 'onTouched',
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit((v) => onSubmit(v.title))} noValidate>
        <DialogTitle>{t('intel.chats.rename.title')}</DialogTitle>
        <DialogContent>
          {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
          <RhfTextField control={control} name="title" label={t('intel.chats.rename.label')} fullWidth required slotProps={{ htmlInput: { maxLength: TITLE_MAX } }} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('intel.common.cancel')}</Button>
          <DuncitButton type="submit" variant="contained" loading={saving || undefined}>
            {t('intel.common.save')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
