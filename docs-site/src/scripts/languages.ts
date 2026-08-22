/**
 * The bridge between a fence language and a Monaco language id.
 *
 * Shared by the playground markup (which renders the language `<select>`) and
 * the playground behaviour (which sets the model language and decides whether
 * Format has anything to run), so the dropdown can never offer a mode the
 * editor does not know.
 */

/** Fence tag as written in a package's MDX → Monaco language id. */
const FROM_FENCE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  javascript: 'javascript',
  mjs: 'javascript',
  json: 'json',
  jsonc: 'json',
  graphql: 'graphql',
  gql: 'graphql',
  bash: 'shell',
  sh: 'shell',
  shell: 'shell',
  zsh: 'shell',
  console: 'shell',
  html: 'html',
  mjml: 'html',
  xml: 'xml',
  css: 'css',
  scss: 'scss',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  mdx: 'markdown',
  sql: 'sql',
  text: 'plaintext',
  txt: 'plaintext',
};

/** What the dropdown offers, in the order a reader of these docs needs it. */
export const EDITOR_LANGUAGES = [
  'typescript',
  'javascript',
  'json',
  'graphql',
  'shell',
  'html',
  'css',
  'markdown',
  'yaml',
  'sql',
  'plaintext',
] as const;

/**
 * Monaco ships a formatter for these and no others. Everything else gets Tidy,
 * which is language-agnostic — and gets told so, rather than being quietly
 * handed a different action than the one that was pressed.
 */
const FORMATTABLE = new Set(['typescript', 'javascript', 'json', 'html', 'css', 'scss', 'less']);

/** A `graphql` fence has no Monaco formatter, so `Format` says so instead. */
export function isFormattable(language: string): boolean {
  return FORMATTABLE.has(language);
}

/** Unknown fences (there are a few one-off ones) read fine as plain text. */
export function monacoLanguage(fence: string): string {
  return FROM_FENCE[fence.toLowerCase()] ?? 'plaintext';
}

/**
 * Language-agnostic cleanup: tabs to two spaces, no trailing whitespace, at
 * most one blank line in a row, exactly one newline at the end.
 *
 * This is the half of "make it readable" that does not need a parser, which is
 * why it works on the shell, GraphQL and MDX blocks that Format cannot touch.
 */
/** Trailing spaces/tabs off ONE line, without an anchored quantifier. */
function trimLineEnd(line: string): string {
  let end = line.length;
  while (end > 0 && (line.charAt(end - 1) === ' ' || line.charAt(end - 1) === '\t')) end -= 1;
  return line.slice(0, end);
}

export function tidy(source: string): string {
  const body = source
    .replaceAll('\t', '  ')
    .split('\n')
    .map(trimLineEnd)
    .join('\n');
  return `${body.replaceAll(/\n{3,}/g, '\n\n').trim()}\n`;
}
