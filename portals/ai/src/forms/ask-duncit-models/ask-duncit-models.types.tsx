import { z } from 'zod';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * Model & LLM Settings for Ask Duncit. The bounds are the server's hard limits
 * (askDuncit.constants HARD_LIMITS) so the form refuses exactly what the API
 * would; the server also refuses a chat model it cannot stream with.
 */
export const buildAskDuncitModelsSchema = (t: Translate) => {
  const model = z.string().trim().min(1, t('ai.askDuncit.validation.modelRequired')).max(80, t('ai.askDuncit.validation.modelMax'));
  const int = (min: number, max: number) =>
    z.coerce.number().int(t('ai.askDuncit.validation.whole')).min(min, t('ai.askDuncit.validation.min', { vars: { min } })).max(max, t('ai.askDuncit.validation.max', { vars: { max } }));
  return z.object({
    default_model: model,
    evaluator_model: model,
    transcription_model: model,
    speech_model: model,
    speech_voice: z.string().trim().min(1, t('ai.askDuncit.validation.voiceRequired')).max(40, t('ai.askDuncit.validation.voiceMax')),
    temperature: z.coerce.number().min(0, t('ai.askDuncit.validation.min', { vars: { min: 0 } })).max(2, t('ai.askDuncit.validation.max', { vars: { max: 2 } })),
    max_output_tokens: int(100, 4000),
    max_tool_rounds: int(0, 10),
    history_turns: int(0, 40),
    low_confidence_threshold: z.coerce.number().min(0, t('ai.askDuncit.validation.min', { vars: { min: 0 } })).max(1, t('ai.askDuncit.validation.max', { vars: { max: 1 } })),
  });
};

export type AskDuncitModelsValues = z.infer<ReturnType<typeof buildAskDuncitModelsSchema>>;

export interface AskDuncitModelsFormProps {
  initialValues: AskDuncitModelsValues;
  submitting: boolean;
  onSubmit: (values: AskDuncitModelsValues) => Promise<void>;
}
