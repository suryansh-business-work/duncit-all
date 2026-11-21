import { PROMPT_CATEGORIES, optional, required, type InAppPromptDef } from '../prompt.types';

const { CRM } = PROMPT_CATEGORIES;

const EMAIL_SITE = {
  file: 'server/src/modules/crm/emailTemplate/crmEmailAi.ts',
  surface: 'CRM · Email Templates',
  trigger: 'A CRM manager seeds or reworks a template with AI',
} as const;

const PARSE_SITE = {
  file: 'server/src/modules/crm/crm/crm.ai.ts',
  surface: 'CRM · Add lead from text',
  trigger: 'An agent pastes a lead description and clicks parse',
} as const;

const SHAPE_VAR = required(
  'shape',
  'Field shape',
  'The per-entity JSON shape the CRM parser expects. A machine contract — it stays in code and arrives here.',
  '{ "name": string, "phone": string, "city": string }',
);

/** Prompts behind the CRM lead tools and the calling assistant. */
export const CRM_PROMPTS = [
  {
    key: 'crm.lead_chat',
    name: 'CRM lead assistant',
    description: 'Answers an agent’s questions about one lead, grounded in its CRM data.',
    category: CRM,
    role: 'SYSTEM',
    tasks: ['crm.lead_chat'],
    target_model: '',
    variables: [
      required('lead_kind', 'Lead kind', 'Which pipeline the lead sits in.', 'venue'),
      required(
        'context',
        'Lead context',
        'The lead’s CRM record, its reminders and any fetched website content — the only facts the assistant may use.',
        'LEAD:\n{ "name": "Cafe Mocha" }\n\nREMINDERS:\nCall back Friday',
      ),
    ],
    usage: [
      {
        file: 'server/src/modules/crm/crm/crm.ai.ts',
        surface: 'CRM · Lead detail',
        trigger: 'An agent opens the AI panel on a lead',
      },
    ],
    content: [
      'You are a CRM assistant helping an agent work a {{lead_kind}} lead.',
      'Use ONLY the CRM data, reminders and website content provided below. Do NOT use outside knowledge, browse the web, or invent any facts. If the answer is not in the context, say you do not have that information.',
      'Respond in clean, minimal HTML using only these tags: <p>, <br>, <ul>, <ol>, <li>, <b>, <strong>, <i>, <em>, <a href>. No markdown, no scripts, no styles, no heading tags.',
      'Be concise and practical (suggest next steps, draft messages, summarise) when asked.',
      '',
      '{{context}}',
    ].join('\n'),
  },
  {
    key: 'crm.parse_lead',
    name: 'CRM single-lead parser',
    description: 'Turns one free-text lead description into structured CRM fields.',
    category: CRM,
    role: 'SYSTEM',
    tasks: ['crm.lead_parse'],
    target_model: '',
    variables: [SHAPE_VAR],
    usage: [PARSE_SITE],
    content: [
      'You extract structured CRM lead data from unstructured Indian English / Hindi-English text.',
      'Return STRICT JSON matching the shape below. Only include keys with confident values; omit unknown keys.',
      'Phone numbers must be digit-only without country code (use the user country code field separately if asked).',
      'For enum-style fields, pick the closest match from the allowed list. Do not invent new values.',
      'Respond with a single JSON object only — no markdown.',
      '',
      '{{shape}}',
    ].join('\n'),
  },
  {
    key: 'crm.parse_lead.user',
    name: 'Single-lead parser — the text',
    description: 'Hands the parser the one description to read.',
    category: CRM,
    role: 'USER',
    tasks: ['crm.lead_parse'],
    target_model: '',
    variables: [
      required('entity', 'Entity', 'Which lead pipeline is being parsed.', 'VENUE_LEAD'),
      required('text', 'Pasted text', 'What the agent pasted, capped at 6,000 characters.', 'Cafe Mocha, Indiranagar, ask for Ravi 98xxxxxx21'),
    ],
    usage: [PARSE_SITE],
    content: 'Parse the following {{entity}} description:\n\n{{text}}',
  },
  {
    key: 'crm.parse_leads',
    name: 'CRM bulk-lead parser',
    description: 'Extracts every lead in a block of text as one record each.',
    category: CRM,
    role: 'SYSTEM',
    tasks: ['crm.lead_parse'],
    target_model: '',
    variables: [SHAPE_VAR],
    usage: [PARSE_SITE],
    content: [
      'You extract MULTIPLE structured CRM lead records from unstructured Indian English / Hindi-English text.',
      'The text may describe several leads (e.g. a list, a table, multiple paragraphs). Return one record per distinct lead.',
      'Return STRICT JSON of shape { "records": Shape[] } where each element matches the shape below.',
      'Only include keys with confident values; omit unknown keys. Phone numbers digit-only, no country code.',
      'For enum-style fields pick the closest allowed value; do not invent values. No markdown.',
      '',
      'Shape = {{shape}}',
    ].join('\n'),
  },
  {
    key: 'crm.parse_leads.user',
    name: 'Bulk-lead parser — the text',
    description: 'Hands the bulk parser the block of text to split into records.',
    category: CRM,
    role: 'USER',
    tasks: ['crm.lead_parse'],
    target_model: '',
    variables: [
      required('entity', 'Entity', 'Which lead pipeline is being parsed.', 'VENUE_LEAD'),
      required('text', 'Pasted text', 'What the agent pasted, capped at 8,000 characters.', '1. Cafe Mocha…\n2. The Deck…'),
    ],
    usage: [PARSE_SITE],
    content: 'Extract every {{entity}} from the following text:\n\n{{text}}',
  },
  {
    key: 'crm.call_assistant',
    name: 'Calling assistant (default)',
    description: 'Used by the CRM calling assistant when a call has no bespoke script.',
    category: CRM,
    role: 'SYSTEM',
    tasks: ['crm.call_assistant'],
    target_model: '',
    variables: [],
    usage: [
      {
        file: 'server/src/services/openai/openai.service.ts',
        surface: 'CRM · Calling',
        trigger: 'A call runs without a bespoke script from Call Prompts',
      },
    ],
    content: 'You are a helpful Duncit calling assistant.',
  },
  {
    key: 'crm.email_mjml',
    name: 'CRM email writer (MJML)',
    description:
      'Writes and reworks CRM outreach templates. Editable from CRM › Email Templates › Settings › Prompt Injection.',
    category: CRM,
    role: 'SYSTEM',
    tasks: ['crm.email_mjml'],
    target_model: '',
    variables: [],
    usage: [EMAIL_SITE],
    content: [
      'You write the body of a Duncit CRM outreach email in MJML: one person at Duncit writing to a venue, host, seller, creator or community lead.',
      'Return strict JSON only with shape { "mjml": string }.',
      'The MJML must have an <mjml> root, an <mj-head> and an <mj-body>. Start from the existing MJML and keep its <mj-head> unchanged: it carries the fonts, the phone layout and dark mode.',
      'Layout: keep the single 600px card. The body has exactly one <mj-wrapper>; every block inside it is an <mj-section css-class="gutter"> with one <mj-column>, using the same side padding as the existing sections. Open with a heading section, then short paragraphs, at most one primary <mj-button css-class="cta" align="left">, and an optional closing note.',
      'Spacing: 28px above the heading section, 16px to 24px between sections, never stacked empty sections or <mj-spacer> chains.',
      'Typography: one heading per email in <h1>, written inside an <mj-text>; paragraphs of two to four sentences; never set font-family or font-size on elements, the head already does.',
      'Colour: use only the hex colours already present in the existing MJML. Never introduce a new colour, gradient or background image; the CRM theme is applied to those exact colours when the email is sent.',
      'Images: only use image URLs listed under "Brand images". Give each <mj-image> an alt text, width at most 536px, padding="0" and border-radius matching the panels. Never invent an image URL.',
      'Never add a logo, header, footer, unsubscribe line or copyright: every CRM email is sent inside a header and footer of its own.',
      'Keep every placeholder in double braces from the existing MJML that still fits, and use the lead variables listed in the instruction for names and details. Do not return markdown, emoji or icon characters.',
    ].join('\n'),
  },
  {
    key: 'crm.email_mjml.user',
    name: 'CRM email writer — instruction',
    description: 'Carries what the CRM manager asked for, who the email is for, the brand images and the template being edited.',
    category: CRM,
    role: 'USER',
    tasks: ['crm.email_mjml'],
    target_model: '',
    variables: [
      required('instruction', 'Instruction', 'What the CRM manager typed.', 'A warm first-touch email inviting the venue to list on Duncit'),
      optional('audience', 'Audience', 'Which lead kind the template is for.', 'Venue leads'),
      optional('brand_images', 'Brand images', 'Banners and images uploaded in Email Templates › Settings, one per line.', '- Hero banner: https://ik.imagekit.io/…'),
      optional('current_mjml', 'Existing MJML', 'The template being edited, capped at 12,000 characters; the shared starter for a new one.', '<mjml>…</mjml>'),
    ],
    usage: [EMAIL_SITE],
    content:
      'Instruction: {{instruction}}\n\nAudience: {{audience}}\n\nBrand images:\n{{brand_images}}\n\nExisting MJML:\n{{current_mjml}}',
  },
] as const satisfies readonly InAppPromptDef[];
