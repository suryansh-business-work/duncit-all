import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { NUMERIC } from '../fields';
import SectionForm from '../SectionForm';
import ModelRows from './ModelRows';
import { makeChatSchema, makeModelsSchema, type ChatOutput, type ChatValues, type ModelsOutput, type ModelsValues } from './models.types';

interface FormProps<TIn, TOut> {
  values: TIn;
  saving: boolean;
  errorMessage: string | null;
  onSubmit: (values: TOut) => void;
}

/** Which models the chat offers (enabled ones appear in the composer) and the default. */
export function ModelsForm({ values, saving, errorMessage, onSubmit }: Readonly<FormProps<ModelsValues, ModelsOutput>>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeModelsSchema(t), [t]);
  const { control, handleSubmit, getValues, setValue } = useForm<ModelsValues, unknown, ModelsOutput>({ defaultValues: values, values, resolver: zodResolver(schema) as Resolver<ModelsValues, unknown, ModelsOutput>, mode: 'onTouched' });
  const setDefault = (index: number) => getValues('models').forEach((_, i) => setValue(`models.${i}.is_default`, i === index, { shouldDirty: true, shouldValidate: true }));
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={1.5}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <ModelRows control={control} setDefault={setDefault} />
        <div>
          <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} loading={saving || undefined}>
            {t('intel.common.save')}
          </DuncitButton>
        </div>
      </Stack>
    </form>
  );
}

/** How the assistant answers: creativity, answer length, tool rounds and remembered turns. */
export function ChatForm({ values, saving, errorMessage, onSubmit }: Readonly<FormProps<ChatValues, ChatOutput>>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeChatSchema(t), [t]);
  return (
    <SectionForm schema={schema} values={values} saving={saving} errorMessage={errorMessage} onSubmit={onSubmit}>
      {(control) => (
        <>
          <RhfTextField control={control} name="temperature" label={t('intel.settings.chat.temperature')} hint={t('intel.settings.chat.temperatureHint')} type="number" slotProps={{ htmlInput: { step: 0.1, min: 0, max: 2 } }} />
          <RhfTextField control={control} name="max_output_tokens" label={t('intel.settings.chat.maxTokens')} {...NUMERIC} />
          <RhfTextField control={control} name="max_tool_rounds" label={t('intel.settings.chat.toolRounds')} hint={t('intel.settings.chat.toolRoundsHint')} {...NUMERIC} />
          <RhfTextField control={control} name="history_turns" label={t('intel.settings.chat.historyTurns')} {...NUMERIC} />
        </>
      )}
    </SectionForm>
  );
}
