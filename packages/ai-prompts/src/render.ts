import type { PromptVariable } from './types';

/**
 * `{{placeholder}}` handling for the prompt editor.
 *
 * The server has its own eight-line copy in `prompt.render.ts` — it imports no
 * `@duncit/*` package by design (rule 40). The preview here has to render the
 * same way the server will, so the substitution rule is repeated verbatim: an
 * unsupplied placeholder is LEFT AS WRITTEN rather than blanked, because some
 * prompt bodies talk about `{{variables}}` as literal text (the MJML writer)
 * and swallowing those would rewrite the instruction.
 */

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

/** Fill `{{name}}` placeholders; anything unsupplied stays exactly as written. */
export function renderPrompt(content: string, variables: Record<string, string> = {}): string {
  // A Map rather than a property lookup: the names come out of a prompt body, so
  // `{{constructor}}` would otherwise resolve against Object.prototype and
  // splice a function into the prompt. A miss returns undefined and falls back
  // to the placeholder; an empty string is a real value and survives.
  const values = new Map(Object.entries(variables));
  return content.replaceAll(PLACEHOLDER, (match, name: string) => values.get(name) ?? match);
}

/** Every distinct placeholder in a body, in first-seen order. */
export function extractVariables(content: string): string[] {
  const found = new Set<string>();
  for (const match of content.matchAll(PLACEHOLDER)) found.add(match[1]);
  return [...found];
}

/**
 * The required placeholders a body has lost.
 *
 * This is the check that makes the library safe to edit: a code prompt whose
 * body dropped `{{navigation_map}}` still runs, still costs money, and answers
 * from nothing — with no error anywhere. The server refuses the save too; this
 * copy exists so the editor can say so before the operator clicks.
 */
export function missingRequiredVariables(
  content: string,
  variables: readonly PromptVariable[],
): string[] {
  const present = new Set(extractVariables(content));
  return variables.filter((v) => v.required && !present.has(v.name)).map((v) => v.name);
}

/** A placeholder written the way it appears in the body. */
export const braced = (name: string) => `{{${name}}}`;

/**
 * The example values a preview renders with. A variable with no example falls
 * back to its own placeholder, which reads better than an empty gap and makes
 * it obvious the catalogue has nothing to show there yet.
 */
export function exampleValues(variables: readonly PromptVariable[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of variables) out[v.name] = v.example || braced(v.name);
  return out;
}

/**
 * Live token-count estimate for the editor. The EXACT formula the server uses
 * (`@services/ai/token-estimate`), so the count shown while typing matches what
 * the library stores and reports: ~4 chars or ~0.75 words per token (OpenAI's
 * rule of thumb), averaged and rounded up.
 */
export function estimateTokens(text: string): number {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return 0;
  const chars = trimmed.length;
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil((chars / 4 + words / 0.75) / 2));
}
