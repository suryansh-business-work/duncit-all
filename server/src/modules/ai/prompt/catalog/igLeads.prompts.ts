import { PROMPT_CATEGORIES, required, type InAppPromptDef } from '../prompt.types';
import { BRAND } from './marketing.prompts';

const { MARKETING } = PROMPT_CATEGORIES;

/**
 * Gemini's free tier — the brief asked for this feature to run without OpenAI
 * spend. Flash-Lite thinks only when asked, so the short max_tokens below go to
 * the answer rather than to hidden reasoning that would leave it empty.
 */
const MODEL = 'gemini-2.5-flash-lite';
const SEARCH_FILE = 'server/src/modules/crm/marketing/igLeads/igLead.search.ts';
const OUTREACH_FILE = 'server/src/modules/crm/marketing/igLeads/igLead.outreach.ts';
const SURFACE = 'Marketing · Instagram Leads';
const FIND = { file: SEARCH_FILE, surface: `${SURFACE} → Find leads`, trigger: 'A marketer presses Find leads' };
const DRAFT = { file: OUTREACH_FILE, surface: `${SURFACE} → Leads`, trigger: 'A marketer presses Draft with AI on a lead' };

/** Every prompt behind Marketing → Instagram Leads: the search plan, the fit score and the DM. */
export const IG_LEAD_PROMPTS = [
  {
    key: 'ig_leads.plan',
    name: 'Instagram lead search plan',
    description: 'Turns a description of the leads wanted into Google searches that surface matching Instagram business profiles.',
    category: MARKETING,
    role: 'SYSTEM',
    tasks: ['marketing.ig_lead_plan'],
    target_model: MODEL,
    variables: [],
    usage: [FIND],
    content: [
      `You plan lead searches for Duncit's marketing team. ${BRAND}`,
      'The marketer describes, in English or Hinglish, the kind of Instagram business or creator accounts they want to reach. Write Google searches that will be run with "site:instagram.com" in front of them.',
      'Each search is 2-6 plain words a business would put in its Instagram name or bio — the trade, the city or area, a niche word. No quotes, no operators, no "instagram" or "site:". Vary them so they find different accounts.',
      'Return STRICT JSON only, no markdown, of shape {"summary":string,"queries":[string],"min_followers":number|null,"max_followers":number|null}.',
      '"summary" restates the target in one sentence. "queries" holds 3 to 5 searches. The follower bounds are null unless the marketer gave them.',
    ].join('\n'),
  },
  {
    key: 'ig_leads.plan.user',
    name: 'Instagram lead search plan — the brief',
    description: 'The marketer’s own words for the leads they want.',
    category: MARKETING,
    role: 'USER',
    tasks: ['marketing.ig_lead_plan'],
    target_model: MODEL,
    variables: [
      required('brief', 'Brief', 'The kind of leads the marketer wants, in their own words.', 'Bangalore ke dog trainers aur pet groomers, 1k-50k followers'),
    ],
    usage: [FIND],
    content: 'Leads wanted: {{brief}}',
  },
  {
    key: 'ig_leads.score',
    name: 'Instagram lead scoring',
    description: 'Scores each found Instagram profile against the brief and says why in a sentence.',
    category: MARKETING,
    role: 'SYSTEM',
    tasks: ['marketing.ig_lead_score'],
    target_model: MODEL,
    variables: [],
    usage: [FIND],
    content: [
      `You qualify leads for Duncit's marketing team. ${BRAND}`,
      'You are given the brief and a list of Instagram profiles, each with its username, name, follower count, website and bio. Judge only from what is written there; never assume facts that are not.',
      'Return STRICT JSON only, no markdown, of shape {"scores":[{"username":string,"score":number,"reason":string}]} with one entry per profile given.',
      '"score" is 0-100: how well the profile matches the brief and how likely it is to be a real, active business worth a message. "reason" is one short sentence naming what you saw.',
    ].join('\n'),
  },
  {
    key: 'ig_leads.score.user',
    name: 'Instagram lead scoring — the profiles',
    description: 'The brief and the profiles to score, one per line.',
    category: MARKETING,
    role: 'USER',
    tasks: ['marketing.ig_lead_score'],
    target_model: MODEL,
    variables: [
      required('brief', 'Brief', 'What the marketer asked for.', 'Dog trainers in Bengaluru'),
      required(
        'profiles',
        'Profiles',
        'One profile per line: username, name, followers, website and bio.',
        '@pawsandplay · Paws & Play · 8,200 followers · pawsandplay.in · Dog training & daycare in HSR Layout',
      ),
    ],
    usage: [FIND],
    content: 'Brief: {{brief}}\nProfiles:\n{{profiles}}',
  },
  {
    key: 'ig_leads.message',
    name: 'Instagram lead DM',
    description: 'Writes the opening DM, or the next follow-up, for one Instagram lead.',
    category: MARKETING,
    role: 'SYSTEM',
    tasks: ['marketing.ig_lead_message'],
    target_model: MODEL,
    variables: [],
    usage: [DRAFT],
    content: [
      `You write Instagram DMs for Duncit's marketing team. ${BRAND}`,
      'Write one message to the business below, from a real person on the Duncit team. Make it about them first — name something specific from their profile — then what Duncit offers them, then one easy question to reply to.',
      'An opener is under 450 characters. A follow-up is shorter, never repeats the earlier messages, adds one new reason to reply, and the last follow-up says plainly that you will not message again. Match the language of their bio (English or Hinglish). No links, no hashtags, no invented facts, prices or dates.',
      'Return STRICT JSON only, no markdown, of shape {"text":string}.',
    ].join('\n'),
  },
  {
    key: 'ig_leads.message.user',
    name: 'Instagram lead DM — the lead',
    description: 'The offer, the lead’s profile, which message this is, and the messages already sent.',
    category: MARKETING,
    role: 'USER',
    tasks: ['marketing.ig_lead_message'],
    target_model: MODEL,
    variables: [
      required('pitch', 'Offer', 'What Duncit is offering these leads, from Instagram Leads settings.', 'Host your dog training sessions as Duncit pods and get members from your area'),
      required('profile', 'Profile', 'The lead’s username, name, followers and bio.', '@pawsandplay · Paws & Play · 8,200 followers\nDog training & daycare in HSR Layout'),
      required('step', 'Which message', 'Whether this is the opener or which follow-up, of how many.', 'Follow-up 1 of 3'),
      required('history', 'Sent so far', 'The messages already sent, oldest first; "none" for an opener.', 'none'),
    ],
    usage: [DRAFT],
    content: 'Offer: {{pitch}}\nLead:\n{{profile}}\nThis message: {{step}}\nSent so far:\n{{history}}',
  },
] as const satisfies readonly InAppPromptDef[];
