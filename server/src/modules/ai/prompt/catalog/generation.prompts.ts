import { PROMPT_CATEGORIES, optional, required, type InAppPromptDef } from '../prompt.types';

const { GENERATION } = PROMPT_CATEGORIES;

const DUMMY_DATA_SITE = {
  file: 'server/src/modules/ai/ai/ai.resolver.ts',
  surface: 'Admin · any create form',
  trigger: 'An admin clicks "Fill with AI"',
} as const;

/** Prompts behind the admin's content generators. */
export const GENERATION_PROMPTS = [
  {
    key: 'generate.dummy_data',
    name: 'Dummy data generator (pods, products…)',
    description:
      'Generates realistic seed records for the admin panel — the "Create a pod" and product generators run on this.',
    category: GENERATION,
    role: 'SYSTEM',
    tasks: ['ai.dummy_data'],
    target_model: '',
    variables: [
      required(
        'fields',
        'JSON shape',
        'The exact TypeScript-like shape the parser expects. A machine contract — it stays in code and arrives here.',
        '{ "title": string, "description": string }',
      ),
      required(
        'notes',
        'Per-entity notes',
        'Extra rules for this entity, supplied by the call site alongside the shape.',
        'Keep titles under 60 characters.',
      ),
      optional(
        'user_prompt',
        'Topic from the admin',
        'What the admin typed in the fill box; empty when they typed nothing.',
        'badminton meetup',
      ),
    ],
    usage: [DUMMY_DATA_SITE],
    content: [
      'You generate realistic dummy data for an admin panel of a community-events app called "Duncit".',
      'The platform hosts in-person and online "pods" (events) organized by clubs in Indian cities.',
      'Return STRICT JSON matching exactly this TypeScript-like shape (no extra keys, no markdown):',
      '{{fields}}',
      '{{notes}}',
      'User-provided context / topic to bias the generation (may be empty): """{{user_prompt}}"""',
      'When no topic is given above, pick a fresh, varied, fun topic each time (sports, photography, tech, foodies, gaming, music, hiking, pets, finance, books, etc.).',
      'Respond with a single JSON object only.',
    ].join('\n\n'),
  },
  {
    key: 'generate.dummy_data.user',
    name: 'Dummy data — the ask',
    description:
      'Asks for one entity and appends the platform’s own category/venue lists so every name the model returns can be looked up.',
    category: GENERATION,
    role: 'USER',
    tasks: ['ai.dummy_data'],
    target_model: '',
    variables: [
      required('entity', 'Entity', 'What is being generated, lowercased.', 'pod'),
      optional('topic', 'Topic clause', 'A leading-space clause naming the topic; empty when none was given.', ' for: badminton'),
      optional(
        'reference',
        'Reference lists',
        'Newline-prefixed block of real categories/venues to choose from; empty when the lookup failed.',
        '\n\nCategories: Sports, Music',
      ),
    ],
    usage: [DUMMY_DATA_SITE],
    content: 'Generate dummy {{entity}} data{{topic}}.{{reference}}',
  },
  {
    key: 'generate.product_copy',
    name: 'Product marketing copy',
    description: 'Writes the short + long description for an inventory product.',
    category: GENERATION,
    role: 'SYSTEM',
    tasks: ['ai.product_copy'],
    target_model: '',
    variables: [],
    usage: [
      {
        file: 'server/src/modules/ai/ai/ai.resolver.ts',
        surface: 'Admin · Products',
        trigger: 'An admin generates a product description',
      },
    ],
    content:
      'You write concise marketing copy for inventory products in an Indian community-events app called Duncit. Always return strict JSON with two keys: { "short_description": string (<= 140 chars), "description": string (2-4 sentences) }. No markdown, no extra keys.',
  },
  {
    key: 'generate.product_copy.user',
    name: 'Product copy — the product',
    description: 'Hands the writer the product it is describing.',
    category: GENERATION,
    role: 'USER',
    tasks: ['ai.product_copy'],
    target_model: '',
    variables: [
      required(
        'context',
        'Product context',
        'Name, category, price and any existing copy, one per line.',
        'Name: Club Tee\nCategory: Apparel',
      ),
    ],
    usage: [
      {
        file: 'server/src/modules/ai/ai/ai.resolver.ts',
        surface: 'Admin · Products',
        trigger: 'An admin generates a product description',
      },
    ],
    content: 'Write marketing copy for this product.\n\n{{context}}',
  },
  {
    key: 'generate.city_zones',
    name: 'City zones & pincodes',
    description: 'Lists the localities and PIN codes of a city for the location tree.',
    category: GENERATION,
    role: 'SYSTEM',
    tasks: ['ai.location_areas'],
    target_model: '',
    variables: [],
    usage: [
      {
        file: 'server/src/modules/ai/ai/ai.resolver.ts',
        surface: 'Admin · Locations',
        trigger: 'An admin fills a city’s zones with AI',
      },
    ],
    content:
      'Return strict JSON only. Generate a comprehensive but practical list of localities, neighbourhoods, and areas for the given city. Each item must include zone_name and pincode as strings. Do not include area codes, IDs, markdown, explanations, or extra keys. Shape: { "zones": [{ "zone_name": string, "pincode": string }] }. Prefer official/common postal PIN codes and remove duplicates.',
  },
  {
    key: 'generate.city_zones.user',
    name: 'City zones — the city',
    description: 'Names the city whose zones are being listed.',
    category: GENERATION,
    role: 'USER',
    tasks: ['ai.location_areas'],
    target_model: '',
    variables: [
      required('country', 'Country', 'Selected country.', 'India'),
      required('state', 'State', 'Selected state.', 'Karnataka'),
      required('city', 'City', 'Selected city.', 'Bengaluru'),
    ],
    usage: [
      {
        file: 'server/src/modules/ai/ai/ai.resolver.ts',
        surface: 'Admin · Locations',
        trigger: 'An admin fills a city’s zones with AI',
      },
    ],
    content: 'Country: {{country}}\nState: {{state}}\nCity: {{city}}',
  },
  {
    key: 'generate.email_mjml',
    name: 'Campaign MJML writer',
    description: 'Generates the MJML body for admin email / WhatsApp fallback campaigns.',
    category: GENERATION,
    role: 'SYSTEM',
    tasks: ['ai.email_mjml'],
    target_model: '',
    variables: [],
    usage: [
      {
        file: 'server/src/modules/ai/ai/ai.resolver.ts',
        surface: 'Admin · Campaigns',
        trigger: 'An admin asks AI to write or rework a campaign template',
      },
    ],
    content: [
      'You write production MJML templates for Duncit admin email and WhatsApp fallback campaigns.',
      'Return strict JSON only with shape { "mjml": string }.',
      'The MJML must include an <mjml> root and <mj-body>. Preserve useful {{variables}} from existing MJML.',
      'Use responsive MJML components only. Do not return markdown.',
    ].join('\n'),
  },
  {
    key: 'generate.email_mjml.user',
    name: 'Campaign MJML — instruction',
    description: 'Carries what the admin asked for plus the template they are editing.',
    category: GENERATION,
    role: 'USER',
    tasks: ['ai.email_mjml'],
    target_model: '',
    variables: [
      required('instruction', 'Instruction', 'What the admin typed.', 'Add a hero image and a join button'),
      optional('current_mjml', 'Existing MJML', 'The template being edited, capped at 12,000 characters; empty for a new one.', '<mjml>…</mjml>'),
    ],
    usage: [
      {
        file: 'server/src/modules/ai/ai/ai.resolver.ts',
        surface: 'Admin · Campaigns',
        trigger: 'An admin asks AI to write or rework a campaign template',
      },
    ],
    content: 'Instruction: {{instruction}}\n\nExisting MJML:\n{{current_mjml}}',
  },
] as const satisfies readonly InAppPromptDef[];
