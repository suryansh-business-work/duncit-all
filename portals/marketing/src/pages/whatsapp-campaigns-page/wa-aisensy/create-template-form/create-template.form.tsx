import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { CreateAisensyTemplateInput } from '../../queries';
import DraftPreview from './DraftPreview';
import TemplateFields from './TemplateFields';
import {
  createTemplateSchema,
  emptyValues,
  toCreateInput,
  type CreateTemplateValues,
} from './create-template.types';

interface Props {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  /** Resolves false when AiSensy refused, which keeps the draft on screen. */
  onSubmit: (input: CreateAisensyTemplateInput) => Promise<boolean>;
}

/**
 * Submit a WhatsApp template straight to AiSensy — nothing about it is stored
 * here, and nothing can be edited afterwards. Both of those are said on the
 * dialog rather than left to be discovered, because the cost of finding out
 * later is a second Meta review under a second name.
 */
export default function CreateTemplateForm({ open, busy, onClose, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => createTemplateSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isValid },
  } = useForm<CreateTemplateValues>({
    defaultValues: emptyValues(),
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (open) reset(emptyValues());
  }, [open, reset]);

  // Watched whole rather than field by field: the preview redraws from every
  // part of the draft, so there is nothing here that is not already changing.
  const values = watch();

  const submit = handleSubmit(async (next) => {
    const ok = await onSubmit(toCreateInput(next));
    if (ok) onClose();
  });

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <form noValidate onSubmit={submit}>
        <DialogTitle>{t('marketingWhatsapp.templateDialogTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">{t('marketingWhatsapp.pendingNote')}</Alert>
            <Alert severity="warning">{t('marketingWhatsapp.noEditWarning')}</Alert>
            <TemplateFields control={control} />
            <DraftPreview values={values} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose} disabled={busy}>
            {t('marketingWhatsapp.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={busy || !isValid}>
            {busy ? t('marketingWhatsapp.submitting') : t('marketingWhatsapp.submitTemplate')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
