import { z } from 'zod';
import { AI_MODEL_ID } from '@duncit/regex';
import { intField, numberField, type Translate } from '../fields';

/** Settings › AI Models: the models on offer and how the assistant answers. Same rules as the server. */

export const makeModelsSchema = (t: Translate) =>
  z.object({
    models: z
      .array(
        z.object({
          id: z.string().trim().regex(AI_MODEL_ID, t('intel.settings.common.modelId')),
          label: z.string().trim().min(1, t('intel.settings.models.labelRequired')).max(60, t('intel.settings.common.max', { vars: { max: 60 } })),
          enabled: z.boolean(),
          is_default: z.boolean(),
        })
      )
      .min(1, t('intel.settings.models.atLeastOne'))
      .max(30, t('intel.settings.common.max', { vars: { max: 30 } }))
      .refine((list) => list.filter((m) => m.is_default && m.enabled).length === 1, t('intel.settings.models.oneDefault'))
      .refine((list) => new Set(list.map((m) => m.id)).size === list.length, t('intel.settings.models.unique')),
  });

export const makeChatSchema = (t: Translate) =>
  z.object({
    temperature: numberField(t, 0, 2),
    max_output_tokens: intField(t, 200, 16000),
    max_tool_rounds: intField(t, 0, 8),
    history_turns: intField(t, 2, 50),
  });

export type ModelsValues = z.input<ReturnType<typeof makeModelsSchema>>;
export type ModelsOutput = z.output<ReturnType<typeof makeModelsSchema>>;
export type ChatValues = z.input<ReturnType<typeof makeChatSchema>>;
export type ChatOutput = z.output<ReturnType<typeof makeChatSchema>>;
