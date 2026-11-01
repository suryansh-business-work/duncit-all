import { GraphQLError } from 'graphql';
import { WaCampaignNameModel } from '../waCampaignName.model';
import { LEAD_PIPELINES, type MarketingLeadPipeline } from '../leads/marketingLead.types';
import {
  OUTREACH_LIMITS as L,
  STEP_KINDS,
  type OutreachSequenceInput,
  type OutreachStepInput,
  type OutreachStepKind,
} from './outreach.types';

/** Trim, bound and check a sequence before it is stored; refuses rather than stores nonsense. */
export function refuse(message: string, code = 'BAD_USER_INPUT'): never {
  throw new GraphQLError(message, { extensions: { code } });
}

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T => values.some((v) => v === value);

function hour(value: number | null | undefined, fallback: number, label: string): number {
  const h = value ?? fallback;
  if (!Number.isInteger(h) || h < L.hour.min || h > L.hour.max) refuse(`${label} must be an hour from ${L.hour.min} to ${L.hour.max}.`);
  return h;
}

export interface CleanStep {
  kind: OutreachStepKind;
  wait_days: number;
  subject: string;
  body: string;
  wa_template_key: string;
  wa_params: string[];
}

function cleanStep(step: OutreachStepInput, n: number): CleanStep {
  if (!isOneOf(STEP_KINDS, step.kind)) refuse(`Step ${n}: that kind of step does not exist.`);
  const blank: CleanStep = { kind: step.kind, wait_days: 0, subject: '', body: '', wa_template_key: '', wa_params: [] };
  const body = (step.body ?? '').trim();
  if (body.length > L.body.max) refuse(`Step ${n}: keep the text under ${L.body.max} characters.`);
  switch (step.kind) {
    case 'WAIT': {
      const days = step.wait_days ?? 0;
      if (!Number.isInteger(days) || days < L.wait_days.min || days > L.wait_days.max) {
        refuse(`Step ${n}: wait ${L.wait_days.min} to ${L.wait_days.max} days.`);
      }
      return { ...blank, wait_days: days };
    }
    case 'EMAIL': {
      const subject = (step.subject ?? '').trim();
      if (!subject || subject.length > L.subject.max) refuse(`Step ${n}: give the email a subject of 1-${L.subject.max} characters.`);
      if (!body) refuse(`Step ${n}: write the email.`);
      return { ...blank, subject, body };
    }
    case 'DM_TASK':
      if (!body) refuse(`Step ${n}: write the DM to send.`);
      return { ...blank, body };
    case 'WHATSAPP': {
      const key = (step.wa_template_key ?? '').trim();
      if (!key) refuse(`Step ${n}: pick the WhatsApp template.`);
      const params = (step.wa_params ?? []).map((p) => p.trim());
      if (params.length > L.wa_params.max || params.some((p) => !p || p.length > L.wa_params.each)) {
        refuse(`Step ${n}: fill every template value (at most ${L.wa_params.max}, ${L.wa_params.each} characters each).`);
      }
      return { ...blank, wa_template_key: key, wa_params: params };
    }
  }
}

export interface CleanSequence {
  name: string;
  description: string;
  pipeline: MarketingLeadPipeline | null;
  steps: CleanStep[];
  daily_limit: number;
  quiet_start_hour: number;
  quiet_end_hour: number;
  stop_on_reply: boolean;
}

/**
 * The sequence as it is stored. A WhatsApp step must name a campaign the
 * Communications portal lists — templates are made there, never here; whether
 * its template is approved is checked again on every send.
 */
export async function cleanSequence(input: OutreachSequenceInput): Promise<CleanSequence> {
  const name = (input.name ?? '').trim();
  if (name.length < L.name.min || name.length > L.name.max) refuse(`Give the sequence a name of ${L.name.min}-${L.name.max} characters.`);
  const description = (input.description ?? '').trim();
  if (description.length > L.description.max) refuse(`Keep the description under ${L.description.max} characters.`);
  if (input.pipeline && !isOneOf(LEAD_PIPELINES, input.pipeline)) refuse('That pipeline does not exist.');
  const raw = input.steps ?? [];
  if (raw.length < L.steps.min || raw.length > L.steps.max) refuse(`A sequence has ${L.steps.min} to ${L.steps.max} steps.`);
  const steps = raw.map((step, i) => cleanStep(step, i + 1));
  if (!steps.some((step) => step.kind !== 'WAIT')) refuse('A sequence needs at least one step that reaches the lead.');
  if (steps.at(-1)?.kind === 'WAIT') refuse('A sequence cannot end with a wait.');
  const keys = [...new Set(steps.filter((s) => s.kind === 'WHATSAPP').map((s) => s.wa_template_key))];
  if (keys.length > 0) {
    const known = new Set((await WaCampaignNameModel.find({ name: { $in: keys } }).select('name').lean()).map((row) => row.name));
    const missing = keys.find((key) => !known.has(key));
    if (missing) refuse(`"${missing}" is not a WhatsApp campaign the Communications portal lists.`);
  }
  const daily = input.daily_limit;
  if (!Number.isInteger(daily) || daily < L.daily_limit.min || daily > L.daily_limit.max) {
    refuse(`The daily limit is a whole number from ${L.daily_limit.min} to ${L.daily_limit.max}.`);
  }
  return {
    name,
    description,
    pipeline: input.pipeline ? (input.pipeline as MarketingLeadPipeline) : null,
    steps,
    daily_limit: daily,
    quiet_start_hour: hour(input.quiet_start_hour, 21, 'Quiet hours start'),
    quiet_end_hour: hour(input.quiet_end_hour, 9, 'Quiet hours end'),
    stop_on_reply: input.stop_on_reply ?? true,
  };
}

/** Where a walk at `index` really goes next: past any waits, with the days they add up to. */
export function nextReachingStep(steps: readonly { kind: string; wait_days?: number | null }[], index: number): { index: number; days: number } {
  let days = 0;
  let i = index;
  while (i < steps.length && steps[i].kind === 'WAIT') {
    days += steps[i].wait_days ?? 0;
    i += 1;
  }
  return { index: i, days };
}

/** {name} and {company} filled from the lead. */
export const fillVars = (text: string, lead: { name?: string | null; company?: string | null }): string =>
  text.replaceAll('{name}', lead.name ?? '').replaceAll('{company}', lead.company || lead.name || '');
