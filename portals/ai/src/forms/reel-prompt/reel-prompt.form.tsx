import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { buildReelPromptSchema, type ReelPromptFormProps, type ReelPromptFormValues } from './reel-prompt.types';

/** "Save prompt": name the request in the composer so it can be reused on any reel. */
export default function ReelPromptForm({ open, content, submitting, onClose, onSubmit }: Readonly<ReelPromptFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelPromptSchema(t), [t]);
  const { control, handleSubmit, reset, formState } = useForm<ReelPromptFormValues, any, ReelPromptFormValues>({
    defaultValues: { name: '', content },
    resolver: zodResolver(schema) as unknown as Resolver<ReelPromptFormValues, any, ReelPromptFormValues>,
    mode: 'onChange',
  });

  useEffect(() => {
    if (open) reset({ name: '', content });
  }, [open, reset, content]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="reel-prompt-form-title">
      <form noValidate onSubmit={submit} data-testid="reel-prompt-form">
        <DialogTitle id="reel-prompt-form-title">{t('ai.reels.prompts.saveTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <RhfTextField
              control={control}
              name="name"
              label={t('ai.reels.prompts.name')}
              hint={t('ai.reels.prompts.nameHint')}
              required
              slotProps={{ htmlInput: { 'data-testid': 'reel-prompt-name' } }}
            />
            <RhfTextField
              control={control}
              name="content"
              label={t('ai.reels.prompts.content')}
              hint={t('ai.reels.prompts.contentHint')}
              required
              multiline
              minRows={3}
              maxRows={10}
              slotProps={{ htmlInput: { 'data-testid': 'reel-prompt-content' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={onClose} data-testid="reel-prompt-cancel">
            {t('shell.common.cancel')}
          </DuncitButton>
          <DuncitButton type="submit" variant="contained" loading={submitting} disabled={!formState.isValid} data-testid="reel-prompt-submit">
            {t('shell.common.save')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
