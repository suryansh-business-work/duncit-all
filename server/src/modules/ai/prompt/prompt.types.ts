import type { OpenAiTaskKey } from '@modules/ai/openaiUsage/openaiUsage.tasks';

/**
 * The shape of a prompt in the AI Library.
 *
 * TWO KINDS live there, and the difference is who owns the row's existence:
 *
 *  - CODE — an "In App Prompt". It is declared in this catalogue, seeded on
 *    boot, and READ BACK BY A CALL SITE on every request. Editing its body in
 *    the AI portal changes what the product sends to the model; that is the
 *    whole point of the library. It cannot be created or deleted from a portal,
 *    because a row nothing calls is not a feature — only "Reset" undoes an edit.
 *  - AI — authored by an operator in the portal. It belongs to nobody in code,
 *    so it is fully CRUD, and it is what the public GET feed is for: something
 *    outside the server fetches it by key and uses it.
 *
 * Two ROLES ship on a CODE prompt: the SYSTEM turn (the standing instruction,
 * the same on every call) and the USER turn (the per-call payload, whose fixed
 * wording used to be a template literal buried at the call site). Both are
 * operator-owned, because a reviewer who can edit "you are the content-safety
 * reviewer" but not "Review this pod:" only half-controls what the model is
 * asked — which is exactly why portal edits used to feel like they did nothing.
 *
 * Everything here except `content` and `target_model` is CODE-owned: it
 * describes where the prompt is wired in, which the operator cannot change from
 * a portal. Those two are the fields the library takes over after the first seed.
 */

/** Who owns the row's existence. See the file comment. */
export type PromptKind = 'CODE' | 'AI';

export type PromptRole = 'SYSTEM' | 'USER';

/** One `{{placeholder}}` the call site fills in at request time. */
export interface PromptVariableDef {
  /** Placeholder name, without the braces. */
  name: string;
  /** How the portal labels the field. */
  label: string;
  /** What the call site puts here, in one line. */
  description: string;
  /**
   * True when dropping it from the body breaks the feature. Editing
   * `askbot.navigation` and deleting `{{navigation_map}}` leaves a bot with no
   * map and no error, so the editor refuses to save a body that lost one.
   */
  required: boolean;
  /** Stand-in the preview renders with, so the operator sees a real prompt. */
  example: string;
}

/** Where a prompt is wired in — the "kahan use ho raha hai" the portal shows. */
export interface PromptUsageSite {
  /** Repo-relative file that sends it. */
  file: string;
  /** The surface a person is looking at when it runs. */
  surface: string;
  /** What they did to trigger it. */
  trigger: string;
}

export interface InAppPromptDef {
  /** Stable identifier the call site names; never changes once shipped. */
  key: string;
  name: string;
  description: string;
  category: string;
  role: PromptRole;
  /**
   * The usage-log task keys this prompt runs under. This is the join that makes
   * "how many times was this prompt used" answerable: the two namespaces were
   * built separately and do not match up by name (`generate.dummy_data` bills to
   * `ai.dummy_data`), and one task can be served by two prompts.
   */
  tasks: readonly OpenAiTaskKey[];
  /** Model the call site pins, or '' when it uses the configured default. */
  target_model: string;
  variables: readonly PromptVariableDef[];
  usage: readonly PromptUsageSite[];
  content: string;
}

export const PROMPT_CATEGORIES = {
  MODERATION: 'Moderation',
  GENERATION: 'Generation',
  SUPPORT: 'Support',
  CRM: 'CRM',
  PLATFORM: 'Platform',
} as const;

/** A required variable, in the shape the catalogue repeats most. */
export const required = (
  name: string,
  label: string,
  description: string,
  example: string,
): PromptVariableDef => ({ name, label, description, required: true, example });

/** An optional variable — the call site may legitimately send nothing. */
export const optional = (
  name: string,
  label: string,
  description: string,
  example: string,
): PromptVariableDef => ({ name, label, description, required: false, example });
