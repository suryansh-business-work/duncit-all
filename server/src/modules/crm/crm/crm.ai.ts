import { GraphQLError } from 'graphql';
import * as C from './crm.constants';
import { VenueLeadModel, HostLeadModel } from './crm.model';
import { WebsitePageModel } from '@modules/crm/websitePage/websitePage.model';
import { ReminderModel } from '@modules/crm/reminder/reminder.model';

const VENUE_SHAPE = `{
  "venue_name": string,                 // required
  "venue_types": string[],              // any of: ${C.VENUE_TYPES.join(', ')}
  "venue_description": string,
  "capacity_min": number | null,
  "capacity_max": number | null,
  "space_type": string,                 // one of: ${C.SPACE_TYPES.join(', ')}
  "city": string,                       // required
  "area": string,
  "full_address": string,               // required
  "landmark": string,
  "map_link": string,
  "contacts": [
    { "name": string, "role": string, "mobile_number": string, "whatsapp_number": string, "email": string }
  ],
  "event_suitability": string[],        // any of: ${C.VENUE_EVENT_SUITABILITY.slice(0, 10).join(', ')}, ...
  "available_days": string[],           // any of: ${C.WEEK_DAYS.join(', ')}
  "available_time_slots": string,
  "booking_notice": string,             // one of: ${C.BOOKING_NOTICES.join(', ')}
  "pricing_models": string[],           // any of: ${C.PRICING_MODELS.join(', ')}
  "expected_charges": number | null,
  "security_deposit": number | null,
  "gst_applicable": boolean,
  "invoice_available": boolean,
  "amenities": string[],
  "lead_source": string,
  "lead_status": string,                // one of: ${C.VENUE_LEAD_STATUSES.join(', ')}
  "priority": string                    // one of: ${C.PRIORITIES.join(', ')}
}`;

const HOST_SHAPE = `{
  "host_name": string,                  // required
  "host_type": string,                  // one of: ${C.HOST_TYPES.join(', ')}
  "organization_name": string,
  "city": string,
  "area": string,
  "contacts": [
    { "name": string, "role": string, "mobile_number": string, "whatsapp_number": string, "email": string }
  ],
  "interests": string[],
  "expected_audience_size": string,     // one of: ${C.AUDIENCE_SIZES.join(', ')}
  "frequency": string,                  // one of: ${C.FREQUENCIES.join(', ')}
  "budget_range": string,
  "revenue_models": string[],           // any of: ${C.REVENUE_MODELS.join(', ')}
  "need_venue": boolean,
  "need_vendor": boolean,
  "preferred_event_date": string,
  "preferred_day": string,
  "preferred_time_slot": string,
  "instagram_link": string,
  "community_link": string,
  "community_size": number | null,
  "previous_events_hosted": boolean,
  "past_attendees": number | null,
  "lead_source": string,
  "lead_status": string,                // one of: ${C.HOST_LEAD_STATUSES.join(', ')}
  "priority": string                    // one of: ${C.PRIORITIES.join(', ')}
}`;

export type CrmAiEntity = 'VENUE_LEAD' | 'HOST_LEAD';

const SHAPES: Record<CrmAiEntity, string> = {
  VENUE_LEAD: VENUE_SHAPE,
  HOST_LEAD: HOST_SHAPE,
};

/** Shared OpenAI JSON call: posts the messages, returns validated JSON content. */
async function chatJson(systemContent: string, userContent: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new GraphQLError('OPENAI_API_KEY is not configured on the server', { extensions: { code: 'AI_NOT_CONFIGURED' } });
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' as const },
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new GraphQLError(`OpenAI error (${resp.status}): ${txt.slice(0, 300)}`, { extensions: { code: 'AI_UPSTREAM_ERROR' } });
  }
  const json: any = await resp.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  if (!content) {
    throw new GraphQLError('OpenAI returned an empty response', { extensions: { code: 'AI_EMPTY_RESPONSE' } });
  }
  try {
    JSON.parse(content);
  } catch {
    throw new GraphQLError('OpenAI did not return valid JSON', { extensions: { code: 'AI_INVALID_JSON' } });
  }
  return content;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** OpenAI chat returning free-form text/HTML (no JSON mode). */
async function chatText(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new GraphQLError('OPENAI_API_KEY is not configured on the server', { extensions: { code: 'AI_NOT_CONFIGURED' } });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature: 0.3, messages }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new GraphQLError(`OpenAI error (${resp.status}): ${txt.slice(0, 300)}`, { extensions: { code: 'AI_UPSTREAM_ERROR' } });
  }
  const json: any = await resp.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  if (!content) throw new GraphQLError('OpenAI returned an empty response', { extensions: { code: 'AI_EMPTY_RESPONSE' } });
  return content;
}

/** Build a compact context string about a lead, including its scraped website pages. */
async function buildLeadContext(entity: CrmAiEntity, leadId: string): Promise<string> {
  const Model: any = entity === 'HOST_LEAD' ? HostLeadModel : VenueLeadModel;
  const lead: any = await Model.findById(leadId).lean();
  if (!lead) throw new GraphQLError('Lead not found', { extensions: { code: 'NOT_FOUND' } });
  const fields = entity === 'VENUE_LEAD'
    ? ['venue_name', 'venue_types', 'venue_description', 'capacity_min', 'capacity_max', 'space_type', 'city', 'area', 'full_address', 'event_suitability', 'amenities', 'pricing_models', 'expected_charges', 'website', 'contacts', 'services_offered', 'lead_status', 'priority', 'remarks']
    : ['host_name', 'host_type', 'organization_name', 'city', 'area', 'interests', 'expected_audience_size', 'frequency', 'budget_range', 'revenue_models', 'website', 'contacts', 'services_offered', 'lead_status', 'priority', 'notes'];
  const picked: Record<string, any> = {};
  for (const f of fields) if (lead[f] != null && lead[f] !== '') picked[f] = lead[f];

  const pages = await WebsitePageModel.find({ entity_type: entity, lead_id: leadId, status: 'FETCHED' })
    .select('url title content_text').limit(15).lean();
  let budget = 12000;
  const site = pages.map((p: any) => {
    const body = String(p.content_text ?? '').slice(0, Math.max(0, budget));
    budget -= body.length;
    return `# ${p.title || p.url}\n${p.url}\n${body}`;
  }).filter(Boolean).join('\n\n');

  const reminders = await ReminderModel.find({ entity_type: entity, lead_id: leadId })
    .select('title due_at status notes').sort({ due_at: 1 }).limit(50).lean();
  const remindersText = reminders.length
    ? reminders.map((r: any) => `- [${r.status}] ${new Date(r.due_at).toISOString()} — ${r.title}${r.notes ? ` (${r.notes})` : ''}`).join('\n')
    : '(No reminders.)';

  return [
    `LEAD DATA (${entity}):`,
    JSON.stringify(picked, null, 2),
    `\nREMINDERS:\n${remindersText}`,
    site ? `\nWEBSITE CONTENT:\n${site}` : '\n(No website content fetched yet.)',
  ].join('\n');
}

/** Conversational assistant grounded in a single lead's CRM data + website content. */
export async function leadAiChat(entity: CrmAiEntity, leadId: string, messages: ChatMessage[]): Promise<string> {
  if (!messages?.length) throw new GraphQLError('A message is required', { extensions: { code: 'BAD_USER_INPUT' } });
  const context = await buildLeadContext(entity, leadId);
  const system = [
    `You are a CRM assistant helping an agent work a ${entity === 'VENUE_LEAD' ? 'venue' : 'host'} lead.`,
    'Use ONLY the CRM data, reminders and website content provided below. Do NOT use outside knowledge, browse the web, or invent any facts. If the answer is not in the context, say you do not have that information.',
    'Respond in clean, minimal HTML using only these tags: <p>, <br>, <ul>, <ol>, <li>, <b>, <strong>, <i>, <em>, <a href>. No markdown, no scripts, no styles, no heading tags.',
    'Be concise and practical (suggest next steps, draft messages, summarise) when asked.',
    '',
    context,
  ].join('\n');
  return chatText([{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))]);
}

export async function parseCrmLeadText(entity: CrmAiEntity, text: string): Promise<string> {
  if (!text?.trim()) {
    throw new GraphQLError('Text input is required', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const system = [
    'You extract structured CRM lead data from unstructured Indian English / Hindi-English text.',
    'Return STRICT JSON matching the shape below. Only include keys with confident values; omit unknown keys.',
    'Phone numbers must be digit-only without country code (use the user country code field separately if asked).',
    'For enum-style fields, pick the closest match from the allowed list. Do not invent new values.',
    'Respond with a single JSON object only — no markdown.',
    '',
    SHAPES[entity],
  ].join('\n');
  return chatJson(system, `Parse the following ${entity} description:\n\n${text.slice(0, 6000)}`);
}

/**
 * Extract MULTIPLE leads from text. Returns a JSON object `{ "records": [...] }`
 * where each record matches the per-entity shape (json_object mode can't return
 * a bare array). The client edits + bulk-creates these.
 */
export async function parseCrmLeadsText(entity: CrmAiEntity, text: string): Promise<string> {
  if (!text?.trim()) {
    throw new GraphQLError('Text input is required', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const system = [
    'You extract MULTIPLE structured CRM lead records from unstructured Indian English / Hindi-English text.',
    'The text may describe several leads (e.g. a list, a table, multiple paragraphs). Return one record per distinct lead.',
    'Return STRICT JSON of shape { "records": Shape[] } where each element matches the shape below.',
    'Only include keys with confident values; omit unknown keys. Phone numbers digit-only, no country code.',
    'For enum-style fields pick the closest allowed value; do not invent values. No markdown.',
    '',
    `Shape = ${SHAPES[entity]}`,
  ].join('\n');
  return chatJson(system, `Extract every ${entity} from the following text:\n\n${text.slice(0, 8000)}`);
}
