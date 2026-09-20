import { z } from 'zod';
import type { Translate } from '@duncit/shell';

/**
 * What each step's settings form validates. Mirrors the server's checks in
 * automation.graph.ts closely enough that a form with no red text saves a
 * step the server will accept — but the server's list of issues is the one
 * that gates activation.
 */

export const VARIABLE_NAME = /^[A-Za-z_]\w{0,63}$/;
export const CONDITION_OPS = ['contains', 'equals', 'starts_with', 'matches', 'is_empty', 'not_empty'] as const;
export const DELAY_UNITS = ['MINUTES', 'HOURS', 'DAYS'] as const;
export const HTTP_METHODS = ['POST', 'GET'] as const;

const variableName = (t: Translate) => z.string().trim().regex(VARIABLE_NAME, t('ai.automation.inspector.ai.outputInvalid'));

export const triggerSchema = () =>
  z.object({
    trigger: z.string(),
    keywords: z.string().max(500).default(''),
    mailbox: z.string().default(''),
  });
export type TriggerValues = z.infer<ReturnType<typeof triggerSchema>>;

export const whatsappSchema = () =>
  z.object({
    campaign_name: z.string().trim().max(120),
    template_params: z.array(z.string().max(1000)),
    media_url: z.string().trim().max(2000),
    media_filename: z.string().trim().max(200),
    buttons: z.array(z.object({ index: z.number(), value: z.string().max(1000) })),
  });
export type WhatsappValues = z.infer<ReturnType<typeof whatsappSchema>>;

export const emailSchema = () =>
  z.object({
    sender_id: z.string(),
    template_slug: z.string(),
    subject: z.string().max(300),
    category: z.string(),
    vars: z.record(z.string(), z.string().max(4000)),
  });
export type EmailValues = z.infer<ReturnType<typeof emailSchema>>;

export const aiComposeSchema = (t: Translate) =>
  z.object({
    prompt_id: z.string(),
    instructions: z.string().trim().min(1, t('ai.automation.inspector.ai.instructionsRequired')).max(6000),
    input: z.string().max(2000),
    output_var: variableName(t).min(1, t('ai.automation.inspector.ai.outputRequired')),
  });
export type AiComposeValues = z.infer<ReturnType<typeof aiComposeSchema>>;

export const aiClassifySchema = (t: Translate) =>
  z.object({
    prompt_id: z.string(),
    instructions: z.string().trim().min(1, t('ai.automation.inspector.ai.instructionsRequired')).max(6000),
    input: z.string().max(2000),
    labels_text: z
      .string()
      .max(2000)
      .refine((text) => text.split('\n').filter((line) => line.trim()).length >= 2, t('ai.automation.inspector.ai.labelsRequired')),
  });
export type AiClassifyValues = z.infer<ReturnType<typeof aiClassifySchema>>;

export const conditionSchema = (t: Translate) =>
  z.object({
    variable: z.string().trim().min(1, t('ai.automation.inspector.condition.variableRequired')).max(120),
    operator: z.enum(CONDITION_OPS),
    value: z.string().max(500),
  });
export type ConditionValues = z.infer<ReturnType<typeof conditionSchema>>;

export const waitSchema = (t: Translate) =>
  z.object({
    timeout_hours: z.coerce.number().min(1, t('ai.automation.inspector.wait.timeoutHint')).max(720, t('ai.automation.inspector.wait.timeoutHint')),
  });
export type WaitValues = z.infer<ReturnType<typeof waitSchema>>;

export const delaySchema = (t: Translate) =>
  z.object({
    amount: z.coerce
      .number()
      .int(t('ai.automation.inspector.delay.amountInvalid'))
      .min(1, t('ai.automation.inspector.delay.amountInvalid'))
      .max(10_000, t('ai.automation.inspector.delay.amountInvalid')),
    unit: z.enum(DELAY_UNITS),
  });
export type DelayValues = z.infer<ReturnType<typeof delaySchema>>;

export const setVariableSchema = (t: Translate) =>
  z.object({
    name: variableName(t),
    value: z.string().max(2000),
  });
export type SetVariableValues = z.infer<ReturnType<typeof setVariableSchema>>;

export const httpSchema = (t: Translate) =>
  z.object({
    method: z.enum(HTTP_METHODS),
    url: z.string().trim().regex(/^https:\/\/\S+$/i, t('ai.automation.inspector.http.urlInvalid')),
    body: z.string().max(10_000),
    output_var: variableName(t),
  });
export type HttpValues = z.infer<ReturnType<typeof httpSchema>>;

export const str = (value: unknown): string => String(value ?? '');
export const strList = (value: unknown): string[] => (Array.isArray(value) ? value.map(str) : []);
