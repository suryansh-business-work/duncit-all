import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { MEDIA_NAME_MAX, mediaNameSchema } from './media-name.schema';
import type { MediaNameFormProps, MediaNameFormValues } from './media-name.types';

/** Rename one uploaded logo or image (lead Logos & Images, email brand library). */
export default function MediaNameForm({
  open,
  initialName,
  submitting,
  error,
  onSubmit,
  onClose,
}: Readonly<MediaNameFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => mediaNameSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MediaNameFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: { name: initialName },
  });

  useEffect(() => {
    if (open) reset({ name: initialName });
  }, [open, initialName, reset]);

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="media-name-form">
        <DialogTitle>{t('crm.media.rename')}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {error}
            </Alert>
          )}
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                label={t('shell.common.name')}
                required
                fullWidth
                // eslint-disable-next-line jsx-a11y/no-autofocus -- focus moves into the dialog the user just opened (WCAG 2.4.3)
                autoFocus
                sx={{ mt: 0.5 }}
                error={!!errors.name}
                helperText={errors.name?.message ?? t('crm.media.nameHint', { vars: { max: MEDIA_NAME_MAX } })}
                slotProps={{ htmlInput: { 'data-testid': 'media-name-input', maxLength: MEDIA_NAME_MAX + 20 } }}
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose} disabled={submitting}>
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={submitting} data-testid="media-name-submit">
            {t('shell.common.save')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
