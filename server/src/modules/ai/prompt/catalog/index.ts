import type { InAppPromptDef } from '../prompt.types';
import { MODERATION_PROMPTS } from './moderation.prompts';
import { GENERATION_PROMPTS } from './generation.prompts';
import { SUPPORT_PROMPTS } from './support.prompts';
import { CRM_PROMPTS } from './crm.prompts';
import { PLATFORM_PROMPTS } from './platform.prompts';

/**
 * Every CODE prompt the product runs on — the "Code Inside Prompt" half of the
 * AI Library.
 *
 * This file is the DEFAULT copy only. On boot each entry is seeded into the
 * library (once), and from then on the call site reads the live row, so an
 * operator edits prompts in the AI portal and never in code. Rows seeded from
 * here are `kind: CODE`: they cannot be created or deleted from the portal, and
 * "Reset" restores the text written here.
 *
 * Split by area rather than kept in one list because the areas are edited by
 * different people at different times, and a 900-line array is a merge conflict
 * waiting to happen.
 */
export const CODE_PROMPTS: readonly InAppPromptDef[] = [
  ...MODERATION_PROMPTS,
  ...GENERATION_PROMPTS,
  ...SUPPORT_PROMPTS,
  ...CRM_PROMPTS,
  ...PLATFORM_PROMPTS,
];

export const CODE_PROMPT_BY_KEY = new Map(CODE_PROMPTS.map((p) => [p.key, p]));

/**
 * Two catalogue entries under one key would seed one row and silently drop the
 * other, so the duplicate is caught at import time rather than at 3am. Thrown
 * from module scope on purpose: a catalogue this broken must not boot.
 */
if (CODE_PROMPT_BY_KEY.size !== CODE_PROMPTS.length) {
  const seen = new Set<string>();
  const dupes = CODE_PROMPTS.map((p) => p.key).filter((key) => !seen.add(key));
  throw new Error(`Duplicate prompt key(s) in the AI catalogue: ${dupes.join(', ')}`);
}
