import { PROMPT_CATEGORIES, required, type InAppPromptDef } from '../prompt.types';
import { BRAND } from './marketing.prompts';

const { MARKETING } = PROMPT_CATEGORIES;

/** Outreach › Sequences drafts a step's words on Claude when a marketer presses Draft with AI. */
const MODEL = 'claude-opus-5-5';
const DRAFT = {
  file: 'server/src/modules/crm/marketing/outreach/outreach.draft.ts',
  surface: 'Marketing · Outreach › Sequences',
  trigger: 'A marketer presses Draft with AI on a step of a saved sequence',
};

export const OUTREACH_PROMPTS = [
  {
    key: 'outreach.step',
    name: 'Outreach sequence step',
    description: 'Writes one step of an outreach sequence: an email, a WhatsApp message or an Instagram DM to a lead.',
    category: MARKETING,
    role: 'SYSTEM',
    tasks: ['marketing.outreach_draft'],
    target_model: MODEL,
    variables: [],
    usage: [DRAFT],
    content: [
      `You write outreach for Duncit's marketing team. ${BRAND}`,
      'Write the one step described below, from a real person on the Duncit team, to a business or person Duncit wants to work with. Lead with them, then what Duncit offers, then one easy question to reply to.',
      'A later step never repeats an earlier one and adds one new reason to reply; the last step says plainly that you will not write again. Keep an email under 150 words and a DM or WhatsApp message under 450 characters.',
      'When no lead is named, write {name} where their name goes and {company} where their business goes, exactly like that. No invented facts, prices, dates or links.',
      'Return STRICT JSON only, no markdown, of shape {"subject":string,"body":string}; "subject" is empty for anything but an email.',
    ].join('\n'),
  },
  {
    key: 'outreach.step.user',
    name: 'Outreach sequence step — the step',
    description: 'The sequence, which step this is, the steps before it and the lead, when one is named.',
    category: MARKETING,
    role: 'USER',
    tasks: ['marketing.outreach_draft'],
    target_model: MODEL,
    variables: [
      required('sequence', 'Sequence', 'The sequence name, its description and the pipeline it is for.', 'Venue partners Pune — cafes that could host pods (pipeline: VENUE)'),
      required('step', 'This step', 'Which step this is, of how many, and what kind of message.', 'Step 1 of 3: an email (subject and body)'),
      required('earlier', 'Earlier steps', 'The steps before this one, in order; "none" for the first.', 'none'),
      required('lead', 'Lead', 'The lead this draft is for, or a note to use {name} and {company}.', 'Blue Cafe, Blue Cafe Pvt, Pune'),
    ],
    usage: [DRAFT],
    content: 'Sequence: {{sequence}}\nThis message: {{step}}\nEarlier steps:\n{{earlier}}\nLead: {{lead}}',
  },
] as const satisfies readonly InAppPromptDef[];
