/**
 * A minimal nginx config reader: enough structure (directives, their words,
 * their nested blocks) to follow `server` → `location` → `proxy_pass`, nothing
 * more. It never evaluates anything — variables, includes and maps stay words.
 */

export interface NginxDirective {
  name: string;
  args: string[];
  /** The `{ … }` body, or null for a directive ended by `;`. */
  block: NginxDirective[] | null;
}

/** A comment, a quoted word, a structural character, or a bare word (`#` only starts a comment at a word's start). */
const TOKEN = /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[{};]|[^\s{};#"'][^\s{};]*/g;

const isQuoted = (token: string) => token.length >= 2 && (token.startsWith('"') || token.startsWith("'"));

/** The config as tokens, comments dropped. A quoted `{` stays quoted, so it is never mistaken for structure. */
export function tokenize(text: string): string[] {
  return (text.match(TOKEN) ?? []).filter((token) => !token.startsWith('#'));
}

/** Parses tokens into a directive tree. An unbalanced `}` is ignored rather than thrown on — a half-written file still maps. */
export function parseNginx(text: string): NginxDirective[] {
  const root: NginxDirective[] = [];
  const stack: NginxDirective[][] = [root];
  let words: string[] = [];
  for (const token of tokenize(text)) {
    const current = stack.at(-1) ?? root;
    if (token === ';' || token === '{') {
      const [name, ...args] = words;
      const block = token === '{' ? [] : null;
      if (name) current.push({ name, args, block });
      if (block) stack.push(block);
      words = [];
    } else if (token === '}') {
      if (stack.length > 1) stack.pop();
      words = [];
    } else {
      words.push(isQuoted(token) ? token.slice(1, -1) : token);
    }
  }
  return root;
}

/** The direct children of a block named `name`. */
export const childrenNamed = (block: NginxDirective[] | null, name: string) =>
  (block ?? []).filter((directive) => directive.name === name);
