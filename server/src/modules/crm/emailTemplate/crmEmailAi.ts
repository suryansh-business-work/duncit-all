import { GraphQLError } from 'graphql';
import { aiPromptService } from '@modules/ai/prompt/prompt.service';
import { writeEmailMjml } from '@modules/ai/ai/emailMjml';
import { crmEmailSettingsService } from './crmEmailSettings.service';

/**
 * The CRM's AI email writer ("Seed MJML with AI" / "Create with AI") and the
 * two prompts behind it.
 *
 * The prompts are CODE rows in the AI Library (`crm.email_mjml` + its USER
 * turn), so the AI portal lists them like every other prompt. CRM managers may
 * edit THOSE TWO from Email Templates › Settings › Prompt Injection — never the
 * shared `generate.email_mjml` the Communications and Marketing consoles write
 * with, so tuning CRM outreach cannot change anyone else's emails.
 */
export const CRM_EMAIL_PROMPT_KEYS = ['crm.email_mjml', 'crm.email_mjml.user'] as const;
type CrmEmailPromptKey = (typeof CRM_EMAIL_PROMPT_KEYS)[number];

const AUDIENCE: Record<string, string> = {
  VENUE: 'Venue leads (venues that could host Duncit events)',
  HOST: 'Host leads (people who run events and communities)',
  ECOMM: 'E-commerce seller leads (brands that could list products)',
  STATIC: 'Any CRM lead (no lead-specific variables)',
};

function promptKey(key: string): CrmEmailPromptKey {
  if (!(CRM_EMAIL_PROMPT_KEYS as readonly string[]).includes(key)) {
    throw new GraphQLError('Only the CRM email prompts can be edited here', { extensions: { code: 'FORBIDDEN' } });
  }
  return key as CrmEmailPromptKey;
}

async function rowFor(key: string) {
  const row = await aiPromptService.getByKey(promptKey(key));
  if (!row) {
    // Seeded on every boot; missing means this server has not booted the catalogue yet.
    throw new GraphQLError('The CRM email prompt is not set up yet — try again in a minute', {
      extensions: { code: 'NOT_FOUND' },
    });
  }
  return row;
}

export interface CrmEmailAiInput {
  prompt: string;
  current_mjml?: string | null;
  target?: string | null;
}

export const crmEmailAi = {
  /** The SYSTEM prompt and its USER turn, in that order. */
  async prompts() {
    const rows = await Promise.all(CRM_EMAIL_PROMPT_KEYS.map((key) => aiPromptService.getByKey(key)));
    return rows.filter((row): row is NonNullable<typeof row> => row !== null);
  },

  async updatePrompt(key: string, content: string) {
    const row = await rowFor(key);
    return aiPromptService.update(row.id, { content });
  },

  async resetPrompt(key: string) {
    const row = await rowFor(key);
    return aiPromptService.reset(row.id);
  },

  /**
   * Write or rework a CRM template. The answer keeps the shared tokens; the
   * CRM theme is put on at render, so what the AI writes follows a later
   * theme change too.
   */
  async generate(input: CrmEmailAiInput) {
    const { brandImages } = await crmEmailSettingsService.renderContext();
    return writeEmailMjml({
      systemKey: 'crm.email_mjml',
      userKey: 'crm.email_mjml.user',
      task: 'crm.email_mjml',
      instruction: input.prompt,
      currentMjml: input.current_mjml,
      vars: {
        audience: AUDIENCE[input.target ?? 'STATIC'] ?? AUDIENCE.STATIC,
        brand_images: brandImages,
      },
    });
  },
};
