import { PROMPT_CATEGORIES, required, type InAppPromptDef } from '../prompt.types';

const { CRM } = PROMPT_CATEGORIES;

/**
 * CRM › Lead Research: the search plan a discovery job runs, and the evidence
 * reader that checks found leads against the published Lead Quality Score
 * criteria. The reader may only quote what the public text says — the server
 * keeps a "met" verdict only when its quote is found word for word in that
 * source, so an invented fact can never earn points.
 *
 * Gemini's free tier, like Instagram Leads: these run once per discovery batch.
 */
const MODEL = 'gemini-2.5-flash-lite';
const DISCOVERY_FILE = 'server/src/modules/crm/leadResearch/leadResearch.discovery.ts';
const VERIFY_FILE = 'server/src/modules/crm/leadResearch/leadResearch.ai.ts';
const PLAN_USAGE = {
  file: DISCOVERY_FILE,
  surface: 'CRM · Lead Research → Discover leads (and MCP discover_external_leads)',
  trigger: 'A CRM manager or their AI assistant starts a lead discovery',
};
const VERIFY_USAGE = {
  file: VERIFY_FILE,
  surface: 'CRM · Lead Research → discovery job',
  trigger: 'A discovery job has found new candidates and reads their public text for evidence',
};

export const CRM_LEAD_RESEARCH_PROMPTS = [
  {
    key: 'crm.lead_research.plan',
    name: 'Lead research search plan',
    description: 'Turns a lead-discovery request (lead type, city, locality, category, keywords) into Google and Google Maps searches.',
    category: CRM,
    role: 'SYSTEM',
    tasks: ['crm.lead_research_plan'],
    target_model: MODEL,
    variables: [],
    usage: [PLAN_USAGE],
    content: [
      'You plan lead searches for Duncit\'s CRM team. Duncit runs small in-person community events ("pods") hosted by people and held at venues, and sells products from partner brands.',
      'Lead types: HOST_LEAD = people or groups who run workshops, classes or events; VENUE_LEAD = cafes, studios, halls and spaces that can hold events; COMMUNITY_LEAD = clubs and groups with active members; CREATOR_LEAD = local Instagram creators; ECOMM_LEAD = brands and sellers with products.',
      'Write searches a business would match by its name, bio or listing: 2-6 plain words with the trade or activity, the locality and the city. No quotes, no operators, no "site:".',
      'Return STRICT JSON only, no markdown: {"queries":[string]} with 3 to 6 different searches. Never invent business names.',
    ].join('\n'),
  },
  {
    key: 'crm.lead_research.plan.user',
    name: 'Lead research search plan — the request',
    description: 'What the CRM manager asked to discover.',
    category: CRM,
    role: 'USER',
    tasks: ['crm.lead_research_plan'],
    target_model: MODEL,
    variables: [
      required('request', 'Request', 'The lead type, city, locality, category and keywords asked for.', 'Lead type: VENUE_LEAD\nCity: Lucknow\nLocality: Gomti Nagar\nCategory: cafe\nKeywords: workshops, events'),
    ],
    usage: [PLAN_USAGE],
    content: 'Discover leads for:\n{{request}}',
  },
  {
    key: 'crm.lead_research.verify',
    name: 'Lead research evidence reader',
    description: 'Reads each found lead\'s public text (Instagram bio, Google listing, search snippet) and says which Lead Quality Score items it proves, quoting the exact words.',
    category: CRM,
    role: 'SYSTEM',
    tasks: ['crm.lead_research_verify'],
    target_model: MODEL,
    variables: [],
    usage: [VERIFY_USAGE],
    content: [
      'You check researched leads for Duncit\'s CRM against its published Lead Quality Score items.',
      'For each lead you get numbered sources (S1, S2…) with their public text, and the list of items with their keys. An item is MET only when a source states it plainly; then copy the shortest exact phrase from that source that proves it (8-160 characters, word for word, no paraphrase).',
      'If no source states it, the item is UNKNOWN. Never use outside knowledge, never guess, never infer from the name alone. Do not mark anything NOT_MET — missing text is UNKNOWN.',
      'Return STRICT JSON only, no markdown: {"leads":[{"lead":number,"items":[{"key":string,"verdict":"MET"|"UNKNOWN","source":"S1","quote":string}]}]}. List only MET items.',
    ].join('\n'),
  },
  {
    key: 'crm.lead_research.verify.user',
    name: 'Lead research evidence reader — the leads',
    description: 'The scoring items and each lead with its numbered public sources.',
    category: CRM,
    role: 'USER',
    tasks: ['crm.lead_research_verify'],
    target_model: MODEL,
    variables: [
      required('items', 'Scoring items', 'One item per line: key — name — what proves it.', 'event_evidence.past_events — Past events held here — photos or posts of events'),
      required(
        'leads',
        'Leads',
        'Each lead numbered, with its sources S1, S2… and their text.',
        'Lead 1: The Barn Cafe (Lucknow)\nS1 [INSTAGRAM] https://www.instagram.com/thebarn/ — Cafe & community space. Open mic every Friday. Book: 98765 43210',
      ),
    ],
    usage: [VERIFY_USAGE],
    content: 'Items:\n{{items}}\n\nLeads:\n{{leads}}',
  },
] as const satisfies readonly InAppPromptDef[];
