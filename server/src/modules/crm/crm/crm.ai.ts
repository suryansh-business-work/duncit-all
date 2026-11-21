import { GraphQLError } from 'graphql';
import { resolvePrompt, type ResolvedPrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat, type OpenAiMessage } from '@services/openai/openai.client';
import { openAiGraphQLError, openAiInvalidJsonError } from '@services/openai/openai.errors';
import * as C from './crm.constants';
import { buildLeadAiContext } from '@modules/crm/leadAi/leadAi.context';

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
async function chatJson(
  system: ResolvedPrompt,
  userContent: string,
  detail: string
): Promise<string> {
  const res = await openaiChat({
    task: 'crm.lead_parse',
    detail,
    model: system.model,
    temperature: 0.1,
    json: true,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: userContent },
    ],
  });
  if (!res.ok) throw openAiGraphQLError(res);
  try {
    JSON.parse(res.content);
  } catch {
    throw openAiInvalidJsonError();
  }
  return res.content;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** OpenAI chat returning free-form text/HTML (no JSON mode). */
async function chatText(
  messages: OpenAiMessage[],
  detail: string,
  model: string
): Promise<string> {
  const res = await openaiChat({ task: 'crm.lead_chat', detail, model, temperature: 0.3, messages });
  if (!res.ok) throw openAiGraphQLError(res);
  return res.content;
}

/**
 * Stateless lead chat behind the deprecated `crmLeadAiChat` mutation, kept for
 * portal builds released before Ask AI threads. It reads the same context as
 * the Ask AI panel (`buildLeadAiContext`).
 */
export async function leadAiChat(entity: CrmAiEntity, leadId: string, messages: ChatMessage[]): Promise<string> {
  if (!messages?.length) throw new GraphQLError('A message is required', { extensions: { code: 'BAD_USER_INPUT' } });
  const { text: context } = await buildLeadAiContext(entity, leadId);
  const system = await resolvePrompt('crm.lead_chat', {
    lead_kind: entity === 'VENUE_LEAD' ? 'venue' : 'host',
    context,
  });
  return chatText(
    [
      { role: 'system', content: system.content },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    `${entity} ${leadId}`,
    system.model
  );
}

export async function parseCrmLeadText(entity: CrmAiEntity, text: string): Promise<string> {
  if (!text?.trim()) {
    throw new GraphQLError('Text input is required', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const [system, user] = await Promise.all([
    resolvePrompt('crm.parse_lead', { shape: SHAPES[entity] }),
    resolvePrompt('crm.parse_lead.user', { entity, text: text.slice(0, 6000) }),
  ]);
  return chatJson(system, user.content, `${entity} (one)`);
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
  const [system, user] = await Promise.all([
    resolvePrompt('crm.parse_leads', { shape: SHAPES[entity] }),
    resolvePrompt('crm.parse_leads.user', { entity, text: text.slice(0, 8000) }),
  ]);
  return chatJson(system, user.content, `${entity} (bulk)`);
}
