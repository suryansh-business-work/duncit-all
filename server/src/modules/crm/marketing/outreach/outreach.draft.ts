import { isValidObjectId } from 'mongoose';
import { askForJson, text } from '../social/social.llm';
import { MarketingLeadModel, type MarketingLeadDoc } from '../leads/marketingLead.model';
import { loadSequence } from './outreach.service';
import { refuse } from './outreach.validate';
import { OUTREACH_LIMITS } from './outreach.types';

/**
 * Claude drafts one step's words — for the sequence in general, or for one
 * lead when one is named. Nothing is saved: the editor fills its fields and a
 * person saves the sequence.
 */
const KIND_TEXT: Record<string, string> = {
  EMAIL: 'an email (subject and body)',
  WHATSAPP: 'a WhatsApp message (body only; the approved template decides what is sent)',
  DM_TASK: 'an Instagram DM a person will send by hand (body only)',
};

export async function draftSequenceStep(sequenceId: string, stepIndex: number, leadId?: string | null) {
  const seq = await loadSequence(sequenceId);
  const step = seq.steps?.[stepIndex];
  if (!step) refuse('That step does not exist in the saved sequence.');
  if (step.kind === 'WAIT') refuse('A wait has no words to draft.');
  let lead: MarketingLeadDoc | null = null;
  if (leadId) {
    lead = isValidObjectId(leadId) ? await MarketingLeadModel.findById(leadId).lean<MarketingLeadDoc>() : null;
    if (!lead) refuse('Lead not found', 'NOT_FOUND');
  }
  const earlier = (seq.steps ?? [])
    .slice(0, stepIndex)
    .filter((s) => s.kind !== 'WAIT')
    .map((s, i) => `${i + 1}. ${s.kind}: ${[s.subject, s.body].filter(Boolean).join(' — ')}`);
  const answer = await askForJson({
    task: 'marketing.outreach_draft',
    systemKey: 'outreach.step',
    userKey: 'outreach.step.user',
    variables: {
      sequence: `${seq.name}${seq.description ? ` — ${seq.description}` : ''} (pipeline: ${seq.pipeline ?? 'any'})`,
      step: `Step ${stepIndex + 1} of ${seq.steps.length}: ${KIND_TEXT[step.kind]}`,
      earlier: earlier.length ? earlier.join('\n') : 'none',
      lead: lead ? `${lead.name}${lead.company ? `, ${lead.company}` : ''}${lead.city ? `, ${lead.city}` : ''}` : 'none — use {name} and {company}',
    },
    detail: `sequence ${seq.name} step ${stepIndex + 1}`,
    maxTokens: 800,
  });
  const body = text(answer.body).slice(0, OUTREACH_LIMITS.body.max);
  if (!body) refuse('The AI answered in a form that could not be read — try again.', 'AI_UNREADABLE');
  return { subject: step.kind === 'EMAIL' ? text(answer.subject).slice(0, OUTREACH_LIMITS.subject.max) : '', body };
}
