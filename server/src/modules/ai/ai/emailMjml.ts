import { GraphQLError } from 'graphql';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { openaiChat } from '@services/openai/openai.client';
import { openAiGraphQLError } from '@services/openai/openai.errors';
import type { OpenAiTaskKey } from '@modules/ai/openaiUsage/openaiUsage.tasks';
import { STARTER_MJML } from '@services/email/catalogue/starter';
import { EMAIL_FALLBACK } from '@services/email/email-i18n';
import { applyVars } from '@modules/content/emailTemplate/emailTemplate.service';
import { onSharedDesign } from '@modules/content/emailTemplate/emailTemplate.chrome';

/** The cap on the MJML handed to the model, so a huge template cannot blow the context. */
export const MJML_PROMPT_CAP = 12000;

/**
 * The shared card a new email is written from, its placeholder copy spelled
 * out: handed the starter's translation keys, the writer kept them, and the
 * email said "Your email heading".
 */
export const starterForAi = (): string =>
  applyVars(
    STARTER_MJML,
    Object.fromEntries(Object.entries(EMAIL_FALLBACK).map(([key, value]) => [`t:${key}`, value]))
  );

export interface WriteEmailMjmlInput {
  /** The SYSTEM and USER catalogue prompts this console writes with. */
  systemKey: string;
  userKey: string;
  task: OpenAiTaskKey;
  instruction: string;
  currentMjml?: string | null;
  /** Further variables the USER prompt reads. */
  vars?: Record<string, string>;
}

/**
 * Write or rework an email body. What comes back is put on the shared card
 * (`onSharedDesign`) whatever the model returned — the consoles that call this
 * all wrap the result in a header/footer fragment of their own.
 */
export async function writeEmailMjml(input: WriteEmailMjmlInput): Promise<string> {
  const instruction = input.instruction.trim();
  if (!instruction) {
    throw new GraphQLError('Prompt is required', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const [system, user] = await Promise.all([
    resolvePrompt(input.systemKey),
    resolvePrompt(input.userKey, {
      ...input.vars,
      instruction,
      current_mjml: (input.currentMjml || starterForAi()).slice(0, MJML_PROMPT_CAP),
    }),
  ]);
  const res = await openaiChat({
    task: input.task,
    detail: instruction.slice(0, 120),
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
  return onSharedDesign(mjml);
}
