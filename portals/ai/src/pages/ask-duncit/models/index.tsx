import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Box } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { AskDuncitModelsForm, type AskDuncitModelsValues } from '../../../forms/ask-duncit-models';
import PageHeader from '../shared/PageHeader';
import { UPDATE_ASK_DUNCIT_MODEL_SETTINGS } from '../shared/mutations';
import { ASK_DUNCIT_SETTINGS } from '../shared/queries';
import type { AskDuncitSettings } from '../shared/types';

/**
 * Ask Duncit › Model & LLM Settings — the default chat model (GPT-4o unless
 * changed), the evaluator, voice models, temperature, token and tool-round
 * limits. Role-wise model assignments live in the Control Center.
 */
export default function AskDuncitModelsPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ askDuncitSettings: AskDuncitSettings }>(ASK_DUNCIT_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [save, saving] = useMutation(UPDATE_ASK_DUNCIT_MODEL_SETTINGS);
  const settings = data?.askDuncitSettings;
  const initialValues = useMemo<AskDuncitModelsValues | null>(
    () =>
      settings
        ? {
            default_model: settings.default_model,
            evaluator_model: settings.evaluator_model,
            transcription_model: settings.transcription_model,
            speech_model: settings.speech_model,
            speech_voice: settings.speech_voice,
            temperature: settings.temperature,
            max_output_tokens: settings.max_output_tokens,
            max_tool_rounds: settings.max_tool_rounds,
            history_turns: settings.history_turns,
            low_confidence_threshold: settings.low_confidence_threshold,
          }
        : null,
    [settings]
  );

  const onSubmit = async (values: AskDuncitModelsValues) => {
    try {
      await save({ variables: { input: values } });
      await refetch();
      notifySuccess(t('ai.askDuncit.saved'));
    } catch (e) {
      notifyError(parseApiError(e) || t('ai.askDuncit.saveFailed'));
    }
  };

  return (
    <Box>
      <PageHeader title={t('ai.askDuncit.models.title')} subtitle={t('ai.askDuncit.models.subtitle')} />
      <QueryGuard loading={loading && !settings} error={error} errorText={t('ai.askDuncit.loadFailed')} spinnerSx={{ py: 6 }}>
        {() => (initialValues ? <AskDuncitModelsForm initialValues={initialValues} submitting={saving.loading} onSubmit={onSubmit} /> : null)}
      </QueryGuard>
    </Box>
  );
}
