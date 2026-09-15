import { z } from 'zod';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/** The same bounds the server's e2eFlow validator enforces. */
export const FLOW_LIMITS = {
  nameMin: 2,
  nameMax: 120,
  descriptionMax: 500,
  stepTextMax: 300,
  stepsMax: 100,
} as const;

/** The validation copy, translated — both flow forms share it. */
export function flowMessages(t: Translate) {
  return {
    nameLength: t('tech.e2eFlows.nameLength', {
      vars: { min: FLOW_LIMITS.nameMin, max: FLOW_LIMITS.nameMax },
    }),
    descriptionTooLong: t('tech.e2eFlows.tooLong', { vars: { max: FLOW_LIMITS.descriptionMax } }),
    stepTooLong: t('tech.e2eFlows.tooLong', { vars: { max: FLOW_LIMITS.stepTextMax } }),
    actionRequired: t('tech.e2eFlows.actionRequired'),
    stepsRequired: t('tech.e2eFlows.stepsRequired'),
    stepsTooMany: t('tech.e2eFlows.stepsTooMany', { vars: { max: FLOW_LIMITS.stepsMax } }),
  };
}

export type FlowMessages = ReturnType<typeof flowMessages>;

/** Name + description: the whole of a flow, and the head of a sub flow. */
export const flowSchema = (messages: FlowMessages) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(FLOW_LIMITS.nameMin, messages.nameLength)
      .max(FLOW_LIMITS.nameMax, messages.nameLength),
    description: z.string().trim().max(FLOW_LIMITS.descriptionMax, messages.descriptionTooLong),
  });

export type FlowValues = z.infer<ReturnType<typeof flowSchema>>;

export const BLANK_FLOW: FlowValues = { name: '', description: '' };
