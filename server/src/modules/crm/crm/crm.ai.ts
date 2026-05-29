import { GraphQLError } from 'graphql';
import * as C from './crm.constants';

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

export async function parseCrmLeadText(entity: CrmAiEntity, text: string): Promise<string> {
  if (!text?.trim()) {
    throw new GraphQLError('Text input is required', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new GraphQLError('OPENAI_API_KEY is not configured on the server', {
      extensions: { code: 'AI_NOT_CONFIGURED' },
    });
  }
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const body = {
    model,
    temperature: 0.1,
    response_format: { type: 'json_object' as const },
    messages: [
      {
        role: 'system',
        content: [
          'You extract structured CRM lead data from unstructured Indian English / Hindi-English text.',
          'Return STRICT JSON matching the shape below. Only include keys with confident values; omit unknown keys.',
          'Phone numbers must be digit-only without country code (use the user country code field separately if asked).',
          'For enum-style fields, pick the closest match from the allowed list. Do not invent new values.',
          'Respond with a single JSON object only — no markdown.',
          '',
          SHAPES[entity],
        ].join('\n'),
      },
      { role: 'user', content: `Parse the following ${entity} description:\n\n${text.slice(0, 6000)}` },
    ],
  };
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new GraphQLError(`OpenAI error (${resp.status}): ${txt.slice(0, 300)}`, {
      extensions: { code: 'AI_UPSTREAM_ERROR' },
    });
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
