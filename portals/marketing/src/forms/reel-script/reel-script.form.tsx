import { useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormControl, FormControlLabel, FormHelperText, FormLabel, Radio, RadioGroup, Stack } from '@mui/material';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { REEL_EDIT_LIMITS } from '../../pages/reels/editor/limits';
import { buildReelScriptSchema, formToScript, scriptToForm, type ReelScriptFormProps, type ReelScriptFormValues } from './reel-script.types';
import ScriptSceneFields from './ScriptSceneFields';

/** The hooks the writer offered, one to be picked; a script with none offered takes a typed one. */
function HookChoice({ control, hooks }: Readonly<{ control: ReturnType<typeof useForm<ReelScriptFormValues>>['control']; hooks: readonly string[] }>) {
  const { t } = useTranslation();
  if (hooks.length === 0) {
    return (
      <RhfTextField
        control={control}
        name="hook"
        label={t('ai.reels.create.fieldHook')}
        size="small"
        required
        slotProps={{ htmlInput: { maxLength: REEL_EDIT_LIMITS.maxTextLength, 'data-testid': 'reel-script-hook' } }}
      />
    );
  }
  return (
    <Controller
      control={control}
      name="hook"
      render={({ field, fieldState }) => (
        <FormControl component="fieldset" error={!!fieldState.error} data-testid="reel-script-hooks">
          <FormLabel component="legend">{t('ai.reels.create.fieldHook')}</FormLabel>
          <RadioGroup value={field.value} onChange={(_event, value) => field.onChange(value)} onBlur={field.onBlur}>
            {hooks.map((hook, index) => (
              <FormControlLabel key={hook} value={hook} control={<Radio size="small" />} label={hook} data-testid={`reel-script-hook-${index + 1}`} />
            ))}
          </RadioGroup>
          <FormHelperText>{fieldState.error?.message ?? t('ai.reels.create.fieldHookHint')}</FormHelperText>
        </FormControl>
      )}
    />
  );
}

/** The script step of Create: pick the hook, tune every scene, write the close, then use it. */
export default function ReelScriptForm({ script, submitting, onSubmit }: Readonly<ReelScriptFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => buildReelScriptSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<ReelScriptFormValues, unknown, ReelScriptFormValues>({
    defaultValues: scriptToForm(script),
    resolver: zodResolver(schema) as unknown as Resolver<ReelScriptFormValues, unknown, ReelScriptFormValues>,
    mode: 'onChange',
  });

  return (
    <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit((values) => onSubmit(formToScript(values)))} data-testid="reel-script-form">
      <HookChoice control={control} hooks={script.hooks} />
      <ScriptSceneFields control={control} />
      <RhfTextField
        control={control}
        name="cta"
        label={t('ai.reels.create.fieldCta')}
        hint={t('ai.reels.create.fieldCtaHint')}
        size="small"
        slotProps={{ htmlInput: { maxLength: REEL_EDIT_LIMITS.maxTextLength, 'data-testid': 'reel-script-cta' } }}
      />
      <DuncitButton
        type="submit"
        variant="contained"
        startIcon={<PlaylistAddCheckIcon />}
        loading={submitting}
        disabled={!formState.isValid}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="reel-script-submit"
      >
        {t('ai.reels.create.useScript')}
      </DuncitButton>
    </Stack>
  );
}
