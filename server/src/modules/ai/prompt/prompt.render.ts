/**
 * `{{placeholder}}` substitution for prompt bodies.
 *
 * The portal package `@duncit/ai-prompts` carries the same two functions for
 * its live preview. They are deliberately duplicated rather than shared: the
 * server imports no `@duncit/*` package (rule 40), because everything it
 * imports has to be COPYied into the Docker image. Both copies are eight lines
 * and both are pinned by tests.
 */

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

/**
 * Fill `{{name}}` placeholders with the values the call site supplied. Anything
 * the call site did not supply is left exactly as written — some prompts talk
 * about `{{variables}}` as literal text (the MJML writer), and swallowing those
 * would rewrite the instruction.
 */
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
