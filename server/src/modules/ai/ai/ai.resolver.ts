import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { importRemoteImage, pexelsSearch } from '@modules/platform/upload/upload.service';
import { UserModel } from '@modules/access/user/user.model';
import { analyticsService } from '@modules/platform/analytics/analytics.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

type Entity = 'CLUB' | 'POD' | 'INVENTORY_PRODUCT';
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];

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
  INVENTORY_PRODUCT: {
    fields: `{
  "product_name": string,           // catchy product name (2-5 words)
  "brand_name": string,             // realistic brand name
  "product_type": "CONSUMABLE" | "MERCHANDISE" | "EQUIPMENT",
  "unit_type": "BOTTLE" | "PIECE" | "PACKET" | "BOX" | "KG" | "LITRE",
  "short_description": string,      // <= 140 chars marketing line
  "description": string,            // 2-4 sentence detailed description
  "tags": string[],                 // 3-5 short lowercase tags
  "vendor_name": string,            // plausible supplier
  "supplier_contact": string,       // +91 phone or email
  "unit_cost": number,              // integer rupees 10-9999
  "purchase_price": number,         // unit_cost +/- 10%
  "selling_price": number,          // 1.2x to 2x purchase_price
  "tax_percent": number,            // 0, 5, 12, 18 or 28
  "discount_percent": number,       // 0-25
  "weight_volume": string,          // e.g. "500 ml", "1 kg", "250 g"
  "storage_instructions": string,   // 1-2 sentences
  "min_order_qty": number,          // 1-5
  "max_order_qty": number,          // 50-500
  "low_stock_alert": number,        // 5-25
  "inventory_count": number         // 20-200
}`,
    example: '',
    notes:
      'Use realistic Indian rupee prices. Tags must be lowercase, no leading #. Pick product_type appropriately for the prompt.',
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
  const apiKey = await getRuntimeEnvValue('OPENAI_API_KEY');
  if (!apiKey) {
    throw new GraphQLError('OPENAI_API_KEY is not configured on the server', {
      extensions: { code: 'AI_NOT_CONFIGURED' },
    });
  }

  const model = (await getRuntimeEnvValue('OPENAI_MODEL')) || 'gpt-4o-mini';
  const body = {
    model,
    temperature: 0.9,
    response_format: { type: 'json_object' as const },
    messages: [
      { role: 'system', content: buildSystemPrompt(entity, prompt) },
      {
        role: 'user',
        content:
          prompt?.trim()
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
  CLUB: { single: [], multiline: ['feature_text', 'moments_text'], folder: '/clubs' },
  POD: { single: [], multiline: ['media_text'], folder: '/pods' },
  INVENTORY_PRODUCT: { single: [], multiline: [], folder: '/inventory' },
};

const TITLE_FIELD_BY_ENTITY: Record<Entity, string> = {
  POD: 'pod_title',
  INVENTORY_PRODUCT: 'product_name',
  CLUB: 'club_name',
};

async function enrichMultilineField(
  parsed: any,
  field: string,
  baseQuery: string,
  folder: string
): Promise<void> {
  const original = typeof parsed[field] === 'string' ? parsed[field] : '';
  const lines = original.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
  const targetCount = Math.min(Math.max(lines.length || 3, 2), 4);
  const urls: string[] = [];
  for (let i = 0; i < targetCount; i++) {
    const url = await pickPexelsImageKitUrl(baseQuery, folder, i);
    if (url) urls.push(url);
  }
  if (urls.length) parsed[field] = urls.join('\n');
}

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
  const titleField = TITLE_FIELD_BY_ENTITY[entity];
  const baseQuery =
    (typeof parsed[titleField] === 'string' && parsed[titleField].trim()) ||
    prompt?.trim() ||
    entity.toLowerCase();

  for (const field of cfg.single) {
    const url = await pickPexelsImageKitUrl(baseQuery, cfg.folder, 0);
    if (url) parsed[field] = url;
  }

  for (const field of cfg.multiline) {
    await enrichMultilineField(parsed, field, baseQuery, cfg.folder);
  }

  return JSON.stringify(parsed);
}

interface DescribeProductInput {
  product_name: string;
  brand_name?: string | null;
  product_type?: string | null;
  short_description?: string | null;
  tags?: string[] | null;
  tone?: string | null;
}

interface LocationAreasInput {
  country: string;
  state: string;
  city: string;
}

interface AiMjmlTemplateInput {
  prompt: string;
  current_mjml?: string | null;
}

async function generateProductDescription(input: DescribeProductInput): Promise<string> {
  const apiKey = await getRuntimeEnvValue('OPENAI_API_KEY');
  if (!apiKey) {
    throw new GraphQLError('OPENAI_API_KEY is not configured on the server', {
      extensions: { code: 'AI_NOT_CONFIGURED' },
    });
  }
  const model = (await getRuntimeEnvValue('OPENAI_MODEL')) || 'gpt-4o-mini';
  const context = [
    `Product name: ${input.product_name}`,
    input.brand_name ? `Brand: ${input.brand_name}` : null,
    input.product_type ? `Type: ${input.product_type}` : null,
    input.tags?.length ? `Tags: ${input.tags.join(', ')}` : null,
    input.short_description ? `Existing short description: ${input.short_description}` : null,
    input.tone ? `Tone: ${input.tone}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const body = {
    model,
    temperature: 0.7,
    response_format: { type: 'json_object' as const },
    messages: [
      {
        role: 'system',
        content:
          'You write concise marketing copy for inventory products in an Indian community-events app called Duncit. Always return strict JSON with two keys: { "short_description": string (<= 140 chars), "description": string (2-4 sentences) }. No markdown, no extra keys.',
      },
      {
        role: 'user',
        content: `Write marketing copy for this product.\n\n${context}`,
      },
    ],
  };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
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
  try {
    JSON.parse(content);
  } catch {
    throw new GraphQLError('OpenAI did not return valid JSON', {
      extensions: { code: 'AI_INVALID_JSON' },
    });
  }
  return content;
}

function normalizeLocationAreas(content: string): string {
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new GraphQLError('OpenAI did not return valid JSON', {
      extensions: { code: 'AI_INVALID_JSON' },
    });
  }
  const areaZones = Array.isArray(parsed?.areas) ? parsed.areas : [];
  const rawZones = Array.isArray(parsed?.zones) ? parsed.zones : areaZones;
  const seen = new Set<string>();
  const zones = rawZones
    .map((zone: any) => ({
      zone_name: String(zone?.zone_name ?? zone?.area_name ?? zone?.name ?? '').trim(),
      pincode: String(zone?.pincode ?? zone?.pin_code ?? zone?.postal_code ?? '').trim(),
    }))
    .filter((zone: { zone_name: string; pincode: string }) => {
      const key = `${zone.zone_name.toLowerCase()}|${zone.pincode}`;
      if (!zone.zone_name || !zone.pincode || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 80);

  if (zones.length === 0) {
    throw new GraphQLError('OpenAI did not return any localities with PIN codes', {
      extensions: { code: 'AI_INVALID_JSON' },
    });
  }
  return JSON.stringify({ zones });
}

async function generateLocationAreas(input: LocationAreasInput): Promise<string> {
  const country = input.country.trim();
  const state = input.state.trim();
  const city = input.city.trim();
  if (!country || !state || !city) {
    throw new GraphQLError('Country, state and city are required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const apiKey = await getRuntimeEnvValue('OPENAI_API_KEY');
  if (!apiKey) {
    throw new GraphQLError('OPENAI_API_KEY is not configured on the server', {
      extensions: { code: 'AI_NOT_CONFIGURED' },
    });
  }
  const model = (await getRuntimeEnvValue('OPENAI_MODEL')) || 'gpt-4o-mini';
  const body = {
    model,
    temperature: 0.2,
    response_format: { type: 'json_object' as const },
    messages: [
      {
        role: 'system',
        content:
          'Return strict JSON only. Generate a comprehensive but practical list of localities, neighbourhoods, and areas for the given city. Each item must include zone_name and pincode as strings. Do not include area codes, IDs, markdown, explanations, or extra keys. Shape: { "zones": [{ "zone_name": string, "pincode": string }] }. Prefer official/common postal PIN codes and remove duplicates.',
      },
      {
        role: 'user',
        content: `Country: ${country}\nState: ${state}\nCity: ${city}`,
      },
    ],
  };
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
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
  return normalizeLocationAreas(content);
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

function promptTerms(prompt: string) {
  // Bounded to RFC limits — the unbounded form backtracks super-linearly on a
  // long prompt that never matches (S5852).
  const email = /[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,253}\.[A-Z]{2,24}/i.exec(prompt)?.[0]?.toLowerCase() ?? '';
  const phone = /\+?\d[\d\s-]{5,}\d/.exec(prompt)?.[0]?.replace(/\D/g, '') ?? '';
  const words = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !['user', 'phone', 'profile', 'link'].includes(word))
    .slice(0, 6);
  return { email, phone: phone.slice(-10), words };
}

async function adminUserContext(prompt: string) {
  const { email, phone, words } = promptTerms(prompt);
  const or: any[] = [];
  if (email) or.push({ 'auth.email': new RegExp(`^${escapeRegex(email)}$`, 'i') });
  if (phone) or.push({ 'auth.phone.number': new RegExp(`${escapeRegex(phone)}$`) });
  for (const word of words) {
    const regex = new RegExp(escapeRegex(word), 'i');
    or.push({ 'profile.first_name': regex }, { 'profile.last_name': regex });
  }
  if (or.length === 0) return [];
  const users = await UserModel.find({ $or: or })
    .select(
      'profile.first_name profile.last_name auth.email auth.phone.number auth.phone.extension auth.is_email_verified metadata.role_keys metadata.status'
    )
    .limit(8)
    .lean();
  return users.map((user: any) => ({
    name: [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' '),
    email: user.auth?.email ?? '',
    phone: `${user.auth?.phone?.extension ?? ''}${user.auth?.phone?.number ?? ''}`,
    roles: user.metadata?.role_keys ?? [],
    status: user.metadata?.status ?? '',
    is_email_verified: !!user.auth?.is_email_verified,
    profile_url: `/users/${String(user._id)}`,
  }));
}

async function adminAiChat(prompt: string) {
  const apiKey = await getRuntimeEnvValue('OPENAI_API_KEY');
  if (!apiKey) {
    throw new GraphQLError('OPENAI_API_KEY is not configured on the server', {
      extensions: { code: 'AI_NOT_CONFIGURED' },
    });
  }
  // Give the model live platform data so it can answer counts/summaries/trends
  // instead of falling back to "I couldn't find any …". Best-effort.
  const [context, platform] = await Promise.all([
    adminUserContext(prompt),
    analyticsService.dashboardTotals(null).catch(() => null),
  ]);
  const model = (await getRuntimeEnvValue('OPENAI_MODEL')) || 'gpt-4o-mini';
  const body = {
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: [
          'You are the Duncit admin assistant. Answer from the provided admin context: platform_stats (live data) and any matched users.',
          'platform_stats holds REAL totals — users_total, pods_total, clubs_total, venues_total, hosts_total, support tickets (open/total/by status), and pods/clubs broken down by super category. Use these for any count, summary or trend question. Never say data is missing when platform_stats contains it.',
          'When user context contains profile_url, include that relative admin link exactly.',
          'Keep answers short, clear and easy to understand. Only ask for a clearer phone/email/name when the question is about a specific person you could not match.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `Admin question: ${prompt.trim()}\n\nAdmin context JSON:\n${JSON.stringify({ platform_stats: platform, users: context }, null, 2)}`,
      },
    ],
  };
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new GraphQLError(`OpenAI error (${resp.status}): ${txt.slice(0, 500)}`, {
      extensions: { code: 'AI_UPSTREAM_ERROR' },
    });
  }
  const json: any = await resp.json();
  return json?.choices?.[0]?.message?.content || 'No answer returned.';
}

async function createOrUpdateMjml(input: AiMjmlTemplateInput) {
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new GraphQLError('Prompt is required', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const apiKey = await getRuntimeEnvValue('OPENAI_API_KEY');
  if (!apiKey) {
    throw new GraphQLError('OPENAI_API_KEY is not configured on the server', {
      extensions: { code: 'AI_NOT_CONFIGURED' },
    });
  }
  const model = (await getRuntimeEnvValue('OPENAI_MODEL')) || 'gpt-4o-mini';
  const body = {
    model,
    temperature: 0.35,
    response_format: { type: 'json_object' as const },
    messages: [
      {
        role: 'system',
        content: [
          'You write production MJML templates for Duncit admin email and WhatsApp fallback campaigns.',
          'Return strict JSON only with shape { "mjml": string }.',
          'The MJML must include an <mjml> root and <mj-body>. Preserve useful {{variables}} from existing MJML.',
          'Use responsive MJML components only. Do not return markdown.',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `Instruction: ${prompt}\n\nExisting MJML:\n${(input.current_mjml || '').slice(0, 12000)}`,
      },
    ],
  };
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new GraphQLError(`OpenAI error (${resp.status}): ${txt.slice(0, 500)}`, {
      extensions: { code: 'AI_UPSTREAM_ERROR' },
    });
  }
  const json: any = await resp.json();
  const content = json?.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content || '{}');
  const mjml = String(parsed?.mjml ?? '').trim();
  if (!/<mjml[\s>]/i.test(mjml)) {
    throw new GraphQLError('OpenAI did not return valid MJML', {
      extensions: { code: 'AI_INVALID_JSON' },
    });
  }
  return mjml;
}

export const aiResolvers = {
  Mutation: {
    aiFillDummyData: async (_: unknown, args: { entity: Entity; prompt?: string | null }) => {
      const raw = await generateDummy(args.entity, args.prompt);
      return enrichImagesWithPexels(args.entity, raw, args.prompt);
    },
    aiDescribeInventoryProduct: async (_: unknown, args: { input: DescribeProductInput }) => {
      return generateProductDescription(args.input);
    },
    aiFillLocationAreas: async (_: unknown, args: { input: LocationAreasInput }) => {
      return generateLocationAreas(args.input);
    },
    adminAiChat: async (_: unknown, args: { prompt: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      if (!args.prompt.trim()) {
        throw new GraphQLError('Prompt is required', { extensions: { code: 'BAD_USER_INPUT' } });
      }
      return adminAiChat(args.prompt);
    },
    aiCreateOrUpdateMjml: async (_: unknown, args: { input: AiMjmlTemplateInput }, ctx: GraphQLContext) => {
      // CRM managers compose MJML email templates from the CRM portal too.
      requireRole(ctx, [...ADMIN_ROLES, 'CRM_MANAGER']);
      return createOrUpdateMjml(args.input);
    },
  },
};
