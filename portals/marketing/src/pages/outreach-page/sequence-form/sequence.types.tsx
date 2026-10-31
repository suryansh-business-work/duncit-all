import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';
import { OUTREACH_LIMITS } from '../copy';
import type { MarketingLeadPipeline } from '../../leads-page/queries';
import type { OutreachSequence, OutreachSequenceInput, OutreachStep, OutreachStepInput, OutreachStepKind, OutreachWaTemplate } from '../queries';

/** One step as the fields hold it: counts as typed text, the WhatsApp values one per line. */
export interface StepFormValues {
  kind: OutreachStepKind;
  wait_days: string;
  subject: string;
  body: string;
  wa_template_key: string;
  wa_params: string;
}

export interface SequenceFormValues {
  name: string;
  description: string;
  /** '' takes leads of any pipeline. */
  pipeline: MarketingLeadPipeline | '';
  steps: StepFormValues[];
  daily_limit: string;
  quiet_start_hour: number;
  quiet_end_hour: number;
  stop_on_reply: boolean;
}

const KIND_VALUES = ['EMAIL', 'WHATSAPP', 'DM_TASK', 'WAIT'] as const;
const PIPELINE_VALUES = ['', 'VENUE', 'HOST', 'BRAND', 'INFLUENCER', 'ADVERTISER', 'GENERAL'] as const;
const DEFAULT_DAILY_LIMIT = 50;
const DEFAULT_QUIET_START = 21;
const DEFAULT_QUIET_END = 9;
const DEFAULT_WAIT_DAYS = 2;

export const blankStep = (kind: OutreachStepKind): StepFormValues => ({
  kind,
  wait_days: kind === 'WAIT' ? String(DEFAULT_WAIT_DAYS) : '',
  subject: '',
  body: '',
  wa_template_key: '',
  wa_params: '',
});

export const blankSequenceValues = (): SequenceFormValues => ({
  name: '',
  description: '',
  pipeline: '',
  steps: [blankStep('EMAIL')],
  daily_limit: String(DEFAULT_DAILY_LIMIT),
  quiet_start_hour: DEFAULT_QUIET_START,
  quiet_end_hour: DEFAULT_QUIET_END,
  stop_on_reply: true,
});

const stepValuesFrom = (step: OutreachStep): StepFormValues => ({
  kind: step.kind,
  wait_days: step.kind === 'WAIT' ? String(step.wait_days) : '',
  subject: step.subject,
  body: step.body,
  wa_template_key: step.wa_template_key,
  wa_params: step.wa_params.join('\n'),
});

export const sequenceValuesFrom = (sequence: OutreachSequence): SequenceFormValues => ({
  name: sequence.name,
  description: sequence.description,
  pipeline: sequence.pipeline ?? '',
  steps: sequence.steps.map(stepValuesFrom),
  daily_limit: String(sequence.daily_limit),
  quiet_start_hour: sequence.quiet_start_hour,
  quiet_end_hour: sequence.quiet_end_hour,
  stop_on_reply: sequence.stop_on_reply,
});

/** The WhatsApp values, one per non-blank line. */
export const paramList = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const wholeIn = (value: string, min: number, max: number) => {
  const n = Number(value.trim());
  return value.trim() !== '' && Number.isInteger(n) && n >= min && n <= max;
};

type Issue = (message: string, path: string) => void;

function checkText(value: string, max: number, required: string, path: string, issue: Issue, t: Translate) {
  if (!value.trim()) issue(required, path);
  else if (value.length > max) issue(t('marketing.outreach.tooLong', { vars: { max: String(max) } }), path);
}

function checkWhatsapp(step: StepFormValues, templates: readonly OutreachWaTemplate[], issue: Issue, t: Translate) {
  const { wa_params } = OUTREACH_LIMITS;
  if (!step.wa_template_key) {
    issue(t('marketing.outreach.templateRequired'), 'wa_template_key');
    return;
  }
  const template = templates.find((row) => row.key === step.wa_template_key);
  if (templates.length > 0 && !template?.approved) issue(t('marketing.outreach.templateNotApproved'), 'wa_template_key');
  const params = paramList(step.wa_params);
  if (params.length > wa_params.max) issue(t('marketing.outreach.paramsTooMany', { vars: { max: String(wa_params.max) } }), 'wa_params');
  else if (params.some((param) => param.length > wa_params.each)) issue(t('marketing.outreach.tooLong', { vars: { max: String(wa_params.each) } }), 'wa_params');
  else if (template?.approved && template.param_count > 0 && params.length !== template.param_count) {
    issue(t('marketing.outreach.paramsMismatch', { vars: { count: String(template.param_count) } }), 'wa_params');
  }
}

const stepSchema = (t: Translate, templates: readonly OutreachWaTemplate[]) =>
  z
    .object({
      kind: z.enum(KIND_VALUES),
      wait_days: z.string(),
      subject: z.string(),
      body: z.string(),
      wa_template_key: z.string(),
      wa_params: z.string(),
    })
    .superRefine((step, ctx) => {
      const issue: Issue = (message, path) => ctx.addIssue({ code: 'custom', message, path: [path] });
      const { body, subject, wait_days } = OUTREACH_LIMITS;
      if (step.kind === 'EMAIL') checkText(step.subject, subject.max, t('marketing.outreach.subjectRequired'), 'subject', issue, t);
      if (step.kind === 'EMAIL' || step.kind === 'DM_TASK') checkText(step.body, body.max, t('marketing.outreach.bodyRequired'), 'body', issue, t);
      if (step.kind === 'WHATSAPP') checkWhatsapp(step, templates, issue, t);
      if (step.kind === 'WAIT' && !wholeIn(step.wait_days, wait_days.min, wait_days.max)) {
        issue(t('marketing.outreach.waitDaysInvalid', { vars: { min: String(wait_days.min), max: String(wait_days.max) } }), 'wait_days');
      }
    });

/** Built per render from the page's translator and the templates the picker offers. */
export const sequenceSchema = (t: Translate = fallbackT, templates: readonly OutreachWaTemplate[] = []) => {
  const { name, description, steps, daily_limit, hour } = OUTREACH_LIMITS;
  return z.object({
    name: z
      .string()
      .trim()
      .min(name.min, t('marketing.outreach.nameRequired'))
      .max(name.max, t('marketing.outreach.tooLong', { vars: { max: String(name.max) } })),
    description: z.string().trim().max(description.max, t('marketing.outreach.tooLong', { vars: { max: String(description.max) } })),
    pipeline: z.enum(PIPELINE_VALUES),
    steps: z
      .array(stepSchema(t, templates))
      .min(steps.min, t('marketing.outreach.stepsTooFew'))
      .max(steps.max, t('marketing.outreach.stepsTooMany', { vars: { max: String(steps.max) } }))
      .refine((list) => list.some((step) => step.kind !== 'WAIT'), t('marketing.outreach.needsSendStep'))
      .refine((list) => list.at(-1)?.kind !== 'WAIT', t('marketing.outreach.endsWithWait')),
    daily_limit: z
      .string()
      .refine(
        (value) => wholeIn(value, daily_limit.min, daily_limit.max),
        t('marketing.outreach.dailyLimitInvalid', { vars: { min: String(daily_limit.min), max: String(daily_limit.max) } }),
      ),
    quiet_start_hour: z.number().int().min(hour.min).max(hour.max),
    quiet_end_hour: z.number().int().min(hour.min).max(hour.max),
    stop_on_reply: z.boolean(),
  });
};

/** Only the fields a step's kind reads go to the server. */
export function toStepInput(step: StepFormValues): OutreachStepInput {
  switch (step.kind) {
    case 'EMAIL':
      return { kind: 'EMAIL', subject: step.subject.trim(), body: step.body.trim() };
    case 'DM_TASK':
      return { kind: 'DM_TASK', body: step.body.trim() };
    case 'WHATSAPP':
      return { kind: 'WHATSAPP', wa_template_key: step.wa_template_key, wa_params: paramList(step.wa_params) };
    default:
      return { kind: 'WAIT', wait_days: Number(step.wait_days) };
  }
}

export const toSequenceInput = (values: SequenceFormValues): OutreachSequenceInput => ({
  name: values.name.trim(),
  description: values.description.trim(),
  pipeline: values.pipeline || null,
  steps: values.steps.map(toStepInput),
  daily_limit: Number(values.daily_limit),
  quiet_start_hour: values.quiet_start_hour,
  quiet_end_hour: values.quiet_end_hour,
  stop_on_reply: values.stop_on_reply,
});

export interface SequenceFormProps {
  /** The sequence being edited; null for a new one. */
  sequence: OutreachSequence | null;
  templates: readonly OutreachWaTemplate[];
  busy: boolean;
  /** Fields shown but not editable, and no Save. */
  readOnly: boolean;
  /** True when the sequence was saved — only then does the dialog close. */
  onSubmit: (values: SequenceFormValues) => Promise<boolean>;
  onCancel: () => void;
}
