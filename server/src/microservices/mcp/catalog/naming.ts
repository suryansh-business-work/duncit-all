/**
 * Names and words derived from a GraphQL field name.
 *
 * `podsTable` → words `pods table` → tool `pods_pods_table`, title "Pods table".
 * Splitting handles acronyms the way the API spells them (`createE2eRun`,
 * `triggerE2eRun`, `getURLConfig`) so a name never runs two words together.
 */

const BOUNDARY = /([a-z0-9])([A-Z])|([A-Z]+)([A-Z][a-z])/g;

/** Lower-case words of a camelCase or snake_case identifier. */
export function wordsOf(identifier: string): string[] {
  return identifier
    .replace(BOUNDARY, (_m, a?: string, b?: string, c?: string, d?: string) => (a ? `${a} ${b}` : `${c} ${d}`))
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

export const snakeCase = (identifier: string): string => wordsOf(identifier).join('_');

/** The category key as a tool-name prefix: `partner-brand` → `partner_brand`. */
export const categoryPrefix = (category: string): string => category.replace(/-/g, '_');

export const toolNameFor = (category: string, fieldName: string): string =>
  `${categoryPrefix(category)}_${snakeCase(fieldName)}`;

/** "createPod" → "Create pod". */
export function titleOf(identifier: string): string {
  const sentence = wordsOf(identifier).join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
