import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { openAiGraphQLError, openAiInvalidJsonError } from '@services/openai/openai.errors';
import { buildFillReference, resolveClubReferences } from './ai-fill-context';
import { importRemoteImage, pexelsSearch } from '@modules/platform/upload/upload.service';
import { UserModel } from '@modules/access/user/user.model';
import { analyticsService } from '@modules/platform/analytics/analytics.service';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

type Entity = 'CLUB' | 'POD' | 'INVENTORY_PRODUCT';
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER'];
const RICH_TEXT_ROLES = [
  'SUPER_ADMIN',
  'SUPPORT_MANAGER',
  'SUPPORT_USER',
  'LEGAL_MANAGER',
  'CRM_MANAGER',
];
const UNSAFE_TAG = /<(?:script|style|iframe|object|embed)\b/i;
const UNSAFE_EVENT_HANDLER = /\son\w+\s*=/i;
const UNSAFE_HREF_SCHEME = /\shref\s*=\s*(?:["']\s*)?(?:javascript|data|vbscript):/i;
const isUnsafeRichText = (value: string) =>
  UNSAFE_TAG.test(value) || UNSAFE_EVENT_HANDLER.test(value) || UNSAFE_HREF_SCHEME.test(value);

const SCHEMAS: Record<Entity, { fields: string; example: string; notes: string }> = {
  CLUB: {
    fields: `{
  "club_name": string,            // catchy short name (3-5 words)
  "club_description": string,     // 1-2 sentence pitch
  "feature_text": string,         // newline-separated public image URLs (3-5 lines)
  "moments_text": string,         // newline-separated public image URLs (2-4 lines)
  "community_link": string,       // https://chat.whatsapp.com/... fake but realistic
  "group_link": string,           // https://chat.whatsapp.com/...
  "who_we_are": string[],         // 3-5 one-line bullets introducing the community
  "what_we_do": string[],         // 3-5 one-line bullets on what members actually do
  "perks": string[],              // 3-5 member perks, 1-4 words each
  "values": string[],             // 3-5 values the club stands for, 1-3 words each
  "faqs": [                       // 3-5 question/answer pairs shown on the club page
    { "question": string, "answer": string }
  ],
  "super_category": string,       // NAME of a super category from the reference data
  "sub_category": string,         // NAME of a sub category listed under that super
  "city": string,                 // NAME of a city from the reference data
  "locality": string,             // NAME of a locality listed under that city
  "club_admin_email": string      // email of the Club Admin to assign, if the prompt names one
}`,
    example: '',
    notes:
      'Use real-looking https://images.unsplash.com/... URLs (or https://picsum.photos/seed/...) for image lines. Bullets are a single line each (<= 90 chars, no leading dash or bullet glyph). FAQ questions end with "?" and answers are 1-2 sentences. Return every key — the form has a section for each and a missing key leaves it empty. super_category, sub_category, city and locality are NAMES, not ids, and the request carries the platform\'s real lists to pick them from: copy the values verbatim from there, because the server looks each one up and drops anything it cannot match.',
  },
  POD: {
    fields: `{
  "club_name": string,            // NAME of the club hosting it, from the reference data
  "pod_title": string,            // event title (5-8 words)
  "pod_description": string,      // 2-3 sentence vivid description
  "pod_hashtag_text": string,     // space-separated hashtags, 3-6, each starts with #
  "media_text": string,           // newline-separated image URLs (2-4 lines)
  "pod_info": string,             // logistics / what to bring / additional notes (1-3 sentences)
  "no_of_spots": number,          // integer 6-40
  "pod_amount": number,           // integer 0-1999, GROSS price user pays
  "pod_type": "NATIVE_FREE" | "NATIVE_PAID" | "NATIVE_PAID_PREMIUM" | "NON_NATIVE_FREE" | "NON_NATIVE_PAID",
  "pod_occurrence": "ONE_TIME" | "DAILY" | "WEEKLY" | "MONTHLY" | "ALTERNATE_DAY" | "WEEKENDS_ONLY",
  "pod_mode": "PHYSICAL" | "VIRTUAL",
  "meeting_platform": "GOOGLE_MEET" | "ZOOM" | "TEAMS" | "OTHER",  // VIRTUAL only, else ""
  "meeting_url": string,          // VIRTUAL only — realistic joinable-looking link, else ""
  "meeting_notes": string,        // VIRTUAL only — 1-2 sentences on how to join, else ""
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
      'club_name must be copied verbatim from the club list in the request — the pod is attached to that club, and a name that is not on the list attaches it to none. pod_type and pod_occurrence must be one of the listed values EXACTLY — any other string is dropped by the form. A pod_type containing FREE means pod_amount 0 and place_charges []; FREE is only valid when pod_mode is VIRTUAL, so a PHYSICAL pod must use a PAID type with a sensible price. Default pod_mode to PHYSICAL unless the prompt clearly describes an online/remote pod; when it is VIRTUAL fill meeting_platform/meeting_url/meeting_notes and leave place_charges empty, and when it is PHYSICAL return "" for all three meeting fields. Hashtags must each start with # and be lowercase / camelCase, no spaces inside a tag. Keep amenity & perk chips short (1-3 words each). place_charges amounts are integer rupees, 0-100000.',
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

/** The per-entity JSON shape is a machine contract with the parser, so it stays
 * in code and is injected into the library prompt as a variable.
 *
 * The enum values mirror `POD_TYPES` / `OCCURRENCES` / `POD_MODES` in
 * `packages/pod-form` and the field list mirrors `ClubFormValues` /
 * `PodFormValues`; the server imports no `@duncit/*` package (rule 40), so they
 * are restated here. A value outside those lists is discarded client-side
 * rather than blanking the field it belongs to. */
function buildSystemPrompt(entity: Entity, userPrompt?: string | null) {
  const { fields, notes } = SCHEMAS[entity];
  return resolvePrompt('generate.dummy_data', {
    fields,
    notes,
    user_prompt: userPrompt?.trim().slice(0, 500) ?? '',
  });
}

/** The instruction plus the platform's own lists, so every name the model
 * answers with is one the lookup afterwards can actually find. A reference
 * lookup that fails must not cost the admin the fill, which is mostly copy. */
async function buildUserMessage(entity: Entity, prompt?: string | null): Promise<string> {
  const topic = prompt?.trim();
  const reference = await buildFillReference(entity).catch((err) => {
    logs.server.warn('ai.resolver', 'buildFillReference', {
      error: err,
      msg: 'reference data unavailable; the fill will not resolve names to ids',
    });
    return '';
  });
  const { content } = await resolvePrompt('generate.dummy_data.user', {
    entity: entity.toLowerCase(),
    // Both clauses carry their own leading separator, because a library body
    // cannot say "and only then a blank line".
    topic: topic ? ` for: ${topic}` : '',
    reference: reference ? `\n\n${reference}` : '',
  });
  return content;
}

export async function generateDummy(entity: Entity, prompt?: string | null): Promise<string> {
  const [system, user] = await Promise.all([
    buildSystemPrompt(entity, prompt),
    buildUserMessage(entity, prompt),
  ]);
  const res = await openaiChat({
    task: 'ai.dummy_data',
    detail: entity,
    model: system.model,
    temperature: 0.9,
    json: true,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: user },
    ],
  });
  if (!res.ok) throw openAiGraphQLError(res);

  // Validate it parses; rethrow as GraphQL error if not.
  try {
    JSON.parse(res.content);
  } catch {
    throw openAiInvalidJsonError();
  }
  return res.content;
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
    // A portal action (the AI content tools), so the PORTALS Upload Settings
    // are the ones that cap and compress what it files away.
    const imported = await importRemoteImage({ remoteUrl: remote, folder, surface: 'PORTALS' });
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

  // Best-effort: a lookup failure must not cost the admin the whole fill, which
  // is mostly the copy they came for.
  if (entity === 'CLUB') {
    try {
      await resolveClubReferences(parsed);
    } catch (err) {
      logs.server.warn('ai.resolver', 'resolveClubReferences', {
        error: err,
        msg: 'club reference resolution failed; text fields still returned',
      });
    }
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

interface AiRichTextImproveInput {
  html: string;
  context?: string | null;
}

async function generateProductDescription(input: DescribeProductInput): Promise<string> {
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

  const [system, user] = await Promise.all([
    resolvePrompt('generate.product_copy'),
    resolvePrompt('generate.product_copy.user', { context }),
  ]);
  const res = await openaiChat({
    task: 'ai.product_copy',
    detail: input.product_name,
    model: system.model,
    temperature: 0.7,
    json: true,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: user.content },
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
  const [system, user] = await Promise.all([
    resolvePrompt('generate.city_zones'),
    resolvePrompt('generate.city_zones.user', { country, state, city }),
  ]);
  const res = await openaiChat({
    task: 'ai.location_areas',
    detail: `${city}, ${state}`,
    model: system.model,
    temperature: 0.2,
    json: true,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: user.content },
    ],
  });
  if (!res.ok) throw openAiGraphQLError(res);
  return normalizeLocationAreas(res.content);
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
  // Give the model live platform data so it can answer counts/summaries/trends
  // instead of falling back to "I couldn't find any …". Best-effort.
  const [context, platform] = await Promise.all([
    adminUserContext(prompt),
    analyticsService.dashboardTotals(null).catch(() => null),
  ]);
  const [system, user] = await Promise.all([
    resolvePrompt('admin.assistant'),
    resolvePrompt('admin.assistant.user', {
      question: prompt.trim(),
      context_json: JSON.stringify({ platform_stats: platform, users: context }, null, 2),
    }),
  ]);
  const res = await openaiChat({
    task: 'ai.admin_chat',
    model: system.model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: user.content },
    ],
  });
  // An empty answer was never an error here — the assistant says so instead.
  if (res.ok) return res.content;
  if (res.code === 'EMPTY') return 'No answer returned.';
  throw openAiGraphQLError(res);
}

async function createOrUpdateMjml(input: AiMjmlTemplateInput) {
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new GraphQLError('Prompt is required', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const [system, user] = await Promise.all([
    resolvePrompt('generate.email_mjml'),
    resolvePrompt('generate.email_mjml.user', {
      instruction: prompt,
      current_mjml: (input.current_mjml || '').slice(0, 12000),
    }),
  ]);
  const res = await openaiChat({
    task: 'ai.email_mjml',
    detail: prompt.slice(0, 120),
    model: system.model,
    temperature: 0.35,
    json: true,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: user.content },
    ],
  });
  if (!res.ok) throw openAiGraphQLError(res);
  const parsed = JSON.parse(res.content || '{}');
  const mjml = String(parsed?.mjml ?? '').trim();
  if (!/<mjml[\s>]/i.test(mjml)) {
    throw new GraphQLError('OpenAI did not return valid MJML', {
      extensions: { code: 'AI_INVALID_JSON' },
    });
  }
  return mjml;
}

function improvedHtml(content: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw openAiInvalidJsonError();
  }
  const value = (parsed as { html?: unknown } | null)?.html;
  const html = typeof value === 'string' ? value.trim() : '';
  if (!html || html.length > 20_000 || isUnsafeRichText(html)) throw openAiInvalidJsonError();
  return html;
}

async function improveRichText(input: AiRichTextImproveInput): Promise<string> {
  const html = input.html.trim();
  if (!html || html.length > 20_000) {
    throw new GraphQLError('Rich text must contain between 1 and 20,000 characters', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const context = (input.context ?? '').trim().slice(0, 200);
  const [system, user] = await Promise.all([
    resolvePrompt('generate.rich_text'),
    resolvePrompt('generate.rich_text.user', {
      // The clause carries its own blank line, so dropping it leaves no gap.
      context: context ? `Context: ${context}\n\n` : '',
      html,
    }),
  ]);
  const res = await openaiChat({
    task: 'ai.rich_text',
    detail: context || 'rich text',
    model: system.model,
    temperature: 0.3,
    json: true,
    messages: [
      { role: 'system', content: system.content },
      { role: 'user', content: user.content },
    ],
  });
  if (!res.ok) throw openAiGraphQLError(res);
  return improvedHtml(res.content);
}

export const aiResolvers = {
  Mutation: {
    aiFillDummyData: async (
      _: unknown,
      args: { entity: Entity; prompt?: string | null },
      ctx: GraphQLContext
    ) => {
      // Only the admin portal fills forms this way, and the fill now reads the
      // Club Admin directory to assign one — so it is gated like the rest of
      // the admin AI surface rather than open to any caller.
      requireRole(ctx, ADMIN_ROLES);
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
    aiImproveRichText: async (
      _: unknown,
      args: { input: AiRichTextImproveInput },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, RICH_TEXT_ROLES);
      return improveRichText(args.input);
    },
  },
};
