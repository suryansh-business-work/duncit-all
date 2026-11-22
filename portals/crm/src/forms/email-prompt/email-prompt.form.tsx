import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Card, CardContent, Chip, Stack, TextField, Tooltip, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { EMAIL_PROMPT_MAX, emailPromptSchema } from './email-prompt.schema';
import type { EmailPromptFormProps, EmailPromptFormValues } from './email-prompt.types';

/**
 * One of the two prompts behind "Seed MJML with AI": what the AI is told
 * (SYSTEM) or how the manager's request is passed to it (USER). Placeholders
 * the CRM fills in are listed as chips; the required ones cannot be removed.
 */
export default function EmailPromptForm({ prompt, submitting, resetting, onSubmit, onReset }: Readonly<EmailPromptFormProps>) {
  const { t } = useTranslation();
  const required = useMemo(() => prompt.variables.filter((v) => v.required).map((v) => v.name), [prompt.variables]);
  const schema = useMemo(() => emailPromptSchema(t, required), [t, required]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EmailPromptFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { content: prompt.content },
  });

  useEffect(() => {
    reset({ content: prompt.content });
  }, [prompt.content, reset]);

  const isSystem = prompt.role === 'SYSTEM';

  return (
    <Card variant="outlined">
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid={`email-prompt-form-${prompt.key}`}>
          <Stack spacing={1.5}>
            <Box>
              <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 800 }}>
                {isSystem ? t('crm.emailSettings.systemPrompt') : t('crm.emailSettings.userPrompt')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {isSystem ? t('crm.emailSettings.systemPromptHint') : t('crm.emailSettings.userPromptHint')}
              </Typography>
            </Box>
            {prompt.variables.length > 0 && (
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                {prompt.variables.map((variable) => (
                  <Tooltip key={variable.name} title={variable.description || variable.label}>
                    <Chip
                      size="small"
                      variant={variable.required ? 'filled' : 'outlined'}
                      color={variable.required ? 'primary' : 'default'}
                      label={`{{${variable.name}}}`}
                      sx={{ fontFamily: 'monospace' }}
                    />
                  </Tooltip>
                ))}
              </Stack>
            )}
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  multiline
                  minRows={isSystem ? 12 : 6}
                  maxRows={28}
                  fullWidth
                  label={t('crm.emailSettings.promptText')}
                  error={!!errors.content}
                  helperText={
                    errors.content?.message ??
                    t('crm.emailSettings.promptLength', { vars: { count: field.value.length, max: EMAIL_PROMPT_MAX } })
                  }
                  slotProps={{ htmlInput: { spellCheck: false, 'data-testid': `email-prompt-input-${prompt.key}` } }}
                  sx={{ '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
                />
              )}
            />
            <Stack direction="row" spacing={1} useFlexGap sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <DuncitButton startIcon={<RestartAltIcon />} onClick={onReset} loading={resetting} disabled={submitting}>
                {t('crm.emailSettings.resetPrompt')}
              </DuncitButton>
              <DuncitButton
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                loading={submitting}
                disabled={!isDirty || resetting}
              >
                {t('crm.emailSettings.savePrompt')}
              </DuncitButton>
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
