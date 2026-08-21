/**
 * Proves the AI Library's code catalogue is internally consistent.
 *
 * Every failure this catches is silent at runtime, which is why it needs a gate
 * of its own — a prompt body is prose, so tsc sees nothing wrong with any of it:
 *
 *  - A declared variable the body never uses: the call site computes a value and
 *    hands it over, and the model is asked the question with the fact missing.
 *  - A placeholder nothing declares: the portal cannot label it, the preview
 *    cannot fill it, and the call site is not passing it — so `{{whatever}}`
 *    reaches the model verbatim.
 *  - A USER prompt with no SYSTEM twin: `resolvePrompt` throws on an unknown key
 *    at the moment the feature runs.
 *  - A key that left the catalogue: `seedDefaults` deletes the row, taking an
 *    operator's edits with it.
 */
import { CODE_PROMPTS, CODE_PROMPT_BY_KEY } from '../src/modules/ai/prompt/catalog';
import { extractVariables } from '../src/modules/ai/prompt/prompt.render';

/**
 * Placeholders that are prose, not substitutions.
 *
 * The MJML writer tells the model to "preserve useful {{variables}} from
 * existing MJML" — it is talking ABOUT braces, and `renderPrompt` leaves an
 * unsupplied placeholder exactly as written precisely so this keeps working.
 */
const LITERAL_PLACEHOLDERS = new Set(['generate.email_mjml:variables']);

/**
 * Every key that has shipped. Removing one is data loss, not a refactor: the
 * boot seed deletes CODE rows the catalogue no longer names, so a renamed key
 * takes the operator's edited body with it. Rename by adding the new key and
 * leaving the old one until its rows are migrated.
 */
const SHIPPED_KEYS = [
  'admin.assistant',
  'admin.assistant.user',
  'agent.console',
  'askbot.navigation',
  'crm.call_assistant',
  'crm.lead_chat',
  'crm.parse_lead',
  'crm.parse_lead.user',
  'crm.parse_leads',
  'crm.parse_leads.user',
  'generate.city_zones',
  'generate.city_zones.user',
  'generate.dummy_data',
  'generate.dummy_data.user',
  'generate.email_mjml',
  'generate.email_mjml.user',
  'generate.product_copy',
  'generate.product_copy.user',
  'generate.rich_text',
  'generate.rich_text.user',
  'moderation.meeting_reason',
  'moderation.pod',
  'moderation.pod.user',
  'moderation.product',
  'moderation.product.user',
  'pod.audit_review',
  'pod.audit_review.user',
  'release.changelog',
  'release.changelog.user',
  'support.assistant',
  'support.mail_auto_reply',
  'support.mail_auto_reply.user',
  'upload.image_scan',
  'upload.image_scan.user',
];

const failures: string[] = [];

for (const key of SHIPPED_KEYS) {
  if (!CODE_PROMPT_BY_KEY.has(key)) {
    failures.push(`"${key}" has shipped but is no longer in the catalogue — the boot seed would delete its row`);
  }
}

for (const prompt of CODE_PROMPTS) {
  if (!prompt.name.trim()) failures.push(`${prompt.key}: empty name`);
  if (!prompt.description.trim()) failures.push(`${prompt.key}: empty description`);
  if (!prompt.content.trim()) failures.push(`${prompt.key}: empty content`);
  if (prompt.usage.length === 0) failures.push(`${prompt.key}: no usage site — the portal cannot say where it runs`);

  const inBody = new Set(extractVariables(prompt.content));
  const declared = new Set(prompt.variables.map((v) => v.name));

  for (const variable of prompt.variables) {
    if (!inBody.has(variable.name)) {
      failures.push(`${prompt.key}: declares {{${variable.name}}} but the body never uses it`);
    }
    if (!variable.label.trim() || !variable.description.trim()) {
      failures.push(`${prompt.key}: {{${variable.name}}} needs a label and a description for the portal`);
    }
  }
  for (const name of inBody) {
    if (declared.has(name) || LITERAL_PLACEHOLDERS.has(`${prompt.key}:${name}`)) continue;
    failures.push(`${prompt.key}: body uses {{${name}}} but nothing declares it, so no call site fills it`);
  }

  if (prompt.role !== 'USER') continue;
  const systemKey = prompt.key.replace(/\.user$/, '');
  if (systemKey === prompt.key) {
    failures.push(`${prompt.key}: a user turn must be named "<system-key>.user"`);
  } else if (!CODE_PROMPT_BY_KEY.has(systemKey)) {
    failures.push(`${prompt.key}: no system prompt "${systemKey}" to pair with`);
  }
}

if (failures.length > 0) {
  console.error('prompt catalogue is inconsistent:\n');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const system = CODE_PROMPTS.filter((p) => p.role === 'SYSTEM').length;
console.log(
  `prompt catalogue: ${CODE_PROMPTS.length} code prompts (${system} system, ${CODE_PROMPTS.length - system} user)`
);
console.log('prompt catalogue is consistent');
