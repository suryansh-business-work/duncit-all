/**
 * The AI Library's two kinds of prompt, and everything a surface needs to say
 * about one. Mirrors `server/src/modules/ai/prompt/prompt.types.ts` — the
 * server imports no `@duncit/*` package by design (rule 40), so the shapes are
 * restated rather than shared, and the GraphQL schema is what pins them
 * together.
 */

/**
 * Who owns a prompt's existence.
 *
 * CODE — declared in the server catalogue, seeded on boot, and read back by a
 * call site on every request. Editing its body in the portal changes what the
 * product sends to the model. It cannot be created or deleted here; "Reset"
 * restores the shipped default.
 *
 * AI — authored in this portal. Owned by nobody in code, fully editable, and
 * served by the public GET feed.
 */
export type PromptKind = 'CODE' | 'AI';

/** Which turn of the conversation a prompt is. */
export type PromptRole = 'SYSTEM' | 'USER';

/** One `{{placeholder}}` the call site fills in at request time. */
export interface PromptVariable {
  name: string;
  label: string;
  description: string;
  /** Dropping a required placeholder breaks the feature silently. */
  required: boolean;
  /** Stand-in the preview renders with, so the operator sees a real prompt. */
  example: string;
}

/** Where a code prompt is wired in. Read-only — it describes the call site. */
export interface PromptUsage {
  file: string;
  surface: string;
  trigger: string;
}

export interface AiPrompt {
  id: string;
  /** Feed address. Every prompt has one; a code prompt's comes from the catalogue. */
  key?: string | null;
  kind: PromptKind;
  role: PromptRole;
  name: string;
  description?: string | null;
  content: string;
  category: string;
  /** Model this prompt is sent to; empty means the configured default. */
  target_model: string;
  variables: PromptVariable[];
  /** Usage-log task keys this prompt bills to. */
  tasks: string[];
  usage: PromptUsage[];
  token_count: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}
