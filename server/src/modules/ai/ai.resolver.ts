import { GraphQLError } from 'graphql';

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
  "duration_minutes": number      // 60, 90, 120, 180
}`,
    example: '',
    notes:
      'If pod_type contains FREE, set pod_amount to 0. Otherwise pick a sensible price. Hashtags must each start with # and be lowercase / camelCase, no spaces inside a tag.',
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

export const aiResolvers = {
  Mutation: {
    aiFillDummyData: async (_: unknown, args: { entity: Entity; prompt?: string | null }) => {
      return generateDummy(args.entity, args.prompt);
    },
  },
};
