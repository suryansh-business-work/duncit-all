import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import {
  buildReelProjectSchema,
  reelProjectInitialValues,
  type ReelProjectFormProps,
  type ReelProjectFormValues,
} from './reel-project.types';

/** The "New reel" dialog, and the same dialog reopened to rename a reel or change its Drive folder. */
export default function ReelProjectForm({
  open,
  initialValues,
  submitting,
  onClose,
  onSubmit,
}: Readonly<ReelProjectFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelProjectSchema(t), [t]);
  const editing = initialValues !== undefined;
  const startValues = initialValues ?? reelProjectInitialValues;
  const { control, handleSubmit, reset, formState } = useForm<ReelProjectFormValues, any, ReelProjectFormValues>({
    defaultValues: startValues,
    resolver: zodResolver(schema) as unknown as Resolver<ReelProjectFormValues, any, ReelProjectFormValues>,
    mode: 'onChange',
  });

  // Keyed on the values, not the object: a parent re-render hands a new object
  // with the same contents and must not wipe what is being typed.
  const { name, drive_url } = startValues;
  useEffect(() => {
    if (open) reset({ name, drive_url });
  }, [open, reset, name, drive_url]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="reel-project-form-title">
      <form noValidate onSubmit={submit} data-testid="reel-project-form">
        <DialogTitle id="reel-project-form-title">
          {editing ? t('ai.reels.form.editTitle') : t('ai.reels.form.createTitle')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <RhfTextField
              control={control}
              name="name"
              label={t('ai.reels.form.name')}
              hint={t('ai.reels.form.nameHint')}
              required
              slotProps={{ htmlInput: { 'data-testid': 'reel-project-name' } }}
            />
            <RhfTextField
              control={control}
              name="drive_url"
              label={t('ai.reels.form.driveUrl')}
              hint={t('ai.reels.form.driveUrlHint')}
              type="url"
              slotProps={{ htmlInput: { 'data-testid': 'reel-project-drive-url', inputMode: 'url' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose} data-testid="reel-project-cancel">
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton
            type="submit"
            variant="contained"
            loading={submitting}
            disabled={!formState.isValid}
            data-testid="reel-project-submit"
          >
            {editing ? t('shell.common.save') : t('ai.reels.form.create')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
