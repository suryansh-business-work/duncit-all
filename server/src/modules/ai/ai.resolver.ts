import { GraphQLError } from 'graphql';
import { importRemoteImage, pexelsSearch } from '../upload/upload.service';

type Entity = 'CLUB' | 'POD' | 'SLIDER';

const SCHEMAS: Record<Entity, { fields: string; example: string; notes: string }> = {
  CLUB: {
    fields: `{
  "club_name": string,            // catchy short name (3-5 words)
  "club_description": string,     // 1-2 sentence pitch
  "feature_text": string,         // newline-separated public image URLs (3-5 lines)
  "moments_text": string,         // newline-separated public image URLs (2-4 lines)
  "community_link": string,       // https://chat.whatsapp.com/... fake but realistic
  "announcement_link": string,    // https://chat.whatsapp.com/...
  "group_link": string            // https://chat.whatsapp.com/...
}`,
    example: '',
    notes: 'Use real-looking https://images.unsplash.com/... URLs (or https://picsum.photos/seed/...) for image lines.',
  },
  POD: {
    fields: `{
  "pod_title": string,            // event title (5-8 words)
  "pod_description": string,      // 2-3 sentence vivid description
  "pod_hashtag_text": string,     // space-separated hashtags, 3-6, each starts with #
  "media_text": string,           // newline-separated image URLs (2-4 lines)
  "pod_info": string,             // logistics / what to bring / additional notes (1-3 sentences)
  "no_of_spots": number,          // integer 6-40
  "pod_amount": number,           // integer 0-1999, GROSS price user pays
  "pod_type": "NATIVE_FREE" | "NATIVE_PAID" | "NATIVE_PAID_PREMIUM" | "NON_NATIVE_FREE" | "NON_NATIVE_PAID" | "NON_NATIVE_PAID_PREMIUM",
  "pod_occurrence": "ONE_TIME" | "RECURRING",
  "zone_name": string,            // a city zone like "Indiranagar" / "Bandra West" / "Connaught Place"
  "starts_in_days": number,       // 1-21 (client converts to actual datetime)
  "duration_minutes": number,     // 60, 90, 120, 180
  "what_this_pod_offers": string[], // 3-6 short amenity chips e.g. "Free WiFi", "Parking", "Pet Friendly"
  "available_perks": string[],    // 2-5 short perk chips e.g. "Free Drink", "Early Entry", "VIP Access"
  "payment_terms": string,        // 2-4 sentences covering refunds, cancellations and tax notes
  "place_charges": [              // 0-4 venue-side charges; empty array if free venue
    { "label": string, "amount": number, "note": string }
  ]
}`,
    example: '',
    notes:
      'If pod_type contains FREE, set pod_amount to 0 and place_charges to []. Otherwise pick a sensible price. Hashtags must each start with # and be lowercase / camelCase, no spaces inside a tag. Keep amenity & perk chips short (1-3 words each). place_charges amounts are integer rupees, 0-100000.',
  },
  SLIDER: {
    fields: `{
  "title": string,             // short marketing headline (3-6 words)
  "description": string,       // 1-line subtext
  "media_url": string,         // public image URL (https://images.unsplash.com/... or https://picsum.photos/seed/...)
  "media_type": "IMAGE" | "VIDEO",
  "link_url": string,          // realistic deep link, e.g. https://duncit.app/clubs/abc123
  "sort_order": number         // 0-100
}`,
    example: '',
    notes: 'Prefer media_type IMAGE unless prompt says video. media_url must be a working https URL.',
  },
};

function buildSystemPrompt(entity: Entity, userPrompt?: string | null) {
  const { fields, notes } = SCHEMAS[entity];
  return [
    `You generate realistic dummy data for an admin panel of a community-events app called "Duncit".`,
    `The platform hosts in-person and online "pods" (events) organized by clubs in Indian cities.`,
    `Return STRICT JSON matching exactly this TypeScript-like shape (no extra keys, no markdown):`,
    fields,
    notes,
    userPrompt
      ? `User-provided context / topic to bias the generation: """${userPrompt.slice(0, 500)}"""`
      : `If no topic is given, pick a fresh, varied, fun topic each time (sports, photography, tech, foodies, gaming, music, hiking, pets, finance, books, etc.).`,
    `Respond with a single JSON object only.`,
  ].join('\n\n');
}

export async function generateDummy(entity: Entity, prompt?: string | null): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new GraphQLError('OPENAI_API_KEY is not configured on the server', {
      extensions: { code: 'AI_NOT_CONFIGURED' },
    });
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const body = {
    model,
    temperature: 0.9,
    response_format: { type: 'json_object' as const },
    messages: [
      { role: 'system', content: buildSystemPrompt(entity, prompt) },
      {
        role: 'user',
        content:
          prompt && prompt.trim()
            ? `Generate dummy ${entity.toLowerCase()} data for: ${prompt.trim()}`
            : `Generate dummy ${entity.toLowerCase()} data.`,
      },
    ],
  };

  let resp: Response;
  try {
    resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    throw new GraphQLError(`Failed to reach OpenAI: ${err?.message || err}`, {
      extensions: { code: 'AI_NETWORK_ERROR' },
    });
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new GraphQLError(`OpenAI error (${resp.status}): ${txt.slice(0, 500)}`, {
      extensions: { code: 'AI_UPSTREAM_ERROR' },
    });
  }

  const json: any = await resp.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  if (!content) {
    throw new GraphQLError('OpenAI returned an empty response', {
      extensions: { code: 'AI_EMPTY_RESPONSE' },
    });
  }

  // Validate it parses; rethrow as GraphQL error if not.
  try {
    JSON.parse(content);
  } catch {
    throw new GraphQLError('OpenAI did not return valid JSON', {
      extensions: { code: 'AI_INVALID_JSON' },
    });
  }
  return content;
}

// ---------------------------------------------------------------------------
// Post-process AI output: swap any free-form image URLs the model invents
// with real Pexels stock photos that have been imported to ImageKit. This
// guarantees the URLs resolve (no 404s) and stay stable on our CDN.
// ---------------------------------------------------------------------------

const IMAGE_FIELDS_BY_ENTITY: Record<Entity, { single: string[]; multiline: string[]; folder: string }> = {
  SLIDER: { single: ['media_url'], multiline: [], folder: '/sliders' },
  CLUB: { single: [], multiline: ['feature_text', 'moments_text'], folder: '/clubs' },
  POD: { single: [], multiline: ['media_text'], folder: '/pods' },
};

async function pickPexelsImageKitUrl(query: string, folder: string, offset = 0): Promise<string | null> {
  try {
    const page = 1 + Math.floor(offset / 12);
    const result = await pexelsSearch({ query, page, perPage: 12 });
    const photo = result.photos?.[offset % 12] || result.photos?.[0];
    const remote = photo?.src_large || photo?.src_medium;
    if (!remote) return null;
    const imported = await importRemoteImage({ remoteUrl: remote, folder });
    return imported.url || null;
  } catch {
    return null;
  }
}

async function enrichImagesWithPexels(entity: Entity, raw: string, prompt?: string | null): Promise<string> {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw;
  }
  const cfg = IMAGE_FIELDS_BY_ENTITY[entity];
  const titleField =
    entity === 'SLIDER' ? 'title' : entity === 'POD' ? 'pod_title' : 'club_name';
  const baseQuery =
    (typeof parsed[titleField] === 'string' && parsed[titleField].trim()) ||
    (prompt && prompt.trim()) ||
    entity.toLowerCase();

  for (const field of cfg.single) {
    const url = await pickPexelsImageKitUrl(baseQuery, cfg.folder, 0);
    if (url) parsed[field] = url;
  }

  for (const field of cfg.multiline) {
    const original = typeof parsed[field] === 'string' ? parsed[field] : '';
    const lines = original.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
    const targetCount = Math.min(Math.max(lines.length || 3, 2), 4);
    const urls: string[] = [];
    for (let i = 0; i < targetCount; i++) {
      const url = await pickPexelsImageKitUrl(baseQuery, cfg.folder, i);
      if (url) urls.push(url);
    }
    if (urls.length) parsed[field] = urls.join('\n');
  }

  return JSON.stringify(parsed);
}

export const aiResolvers = {
  Mutation: {
    aiFillDummyData: async (_: unknown, args: { entity: Entity; prompt?: string | null }) => {
      const raw = await generateDummy(args.entity, args.prompt);
      return enrichImagesWithPexels(args.entity, raw, args.prompt);
    },
  },
};
