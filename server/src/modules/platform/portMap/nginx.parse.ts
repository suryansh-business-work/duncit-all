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

/** The token kinds, tried in this order. */
const TOKEN_KINDS = [
  String.raw`#[^\n]*`, // a comment
  String.raw`"(?:\\.|[^"\\])*"`, // a double-quoted word
  String.raw`'(?:\\.|[^'\\])*'`, // a single-quoted word
  '[{};]', // a structural character
  String.raw`[^\s{};#"'][^\s{};]*`, // a bare word (`#` only starts a comment at a word's start)
];
const TOKEN = new RegExp(TOKEN_KINDS.join('|'), 'g');

const isQuoted = (token: string) => token.length >= 2 && (token.startsWith('"') || token.startsWith("'"));

const unquote = (token: string) => (isQuoted(token) ? token.slice(1, -1) : token);

/** Ends the words so far as a directive in `current`; returns the block it opens, if it opens one. */
function endDirective(current: NginxDirective[], words: string[], opensBlock: boolean): NginxDirective[] | null {
  const [name, ...args] = words;
  const block = opensBlock ? [] : null;
  if (name) current.push({ name, args, block });
  return block;
}

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
    if (token === ';' || token === '{') {
      const block = endDirective(stack.at(-1) ?? root, words, token === '{');
      if (block) stack.push(block);
      words = [];
    } else if (token === '}') {
      if (stack.length > 1) stack.pop();
      words = [];
    } else {
      words.push(unquote(token));
    }
  }
  return root;
}

/** The direct children of a block named `name`. */
export const childrenNamed = (block: NginxDirective[] | null, name: string) =>
  (block ?? []).filter((directive) => directive.name === name);
