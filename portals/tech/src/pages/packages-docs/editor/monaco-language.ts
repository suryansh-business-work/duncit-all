/**
 * A fence's language tag → the Monaco mode that colours it.
 *
 * Docs are written with the tag a reader expects (`ts`, `sh`, `gql`); Monaco
 * knows a different, longer set of names. Anything unmapped opens as plain
 * text, which is the honest outcome — a wrong mode underlines correct code.
 */
const MONACO_BY_TAG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  javascript: 'javascript',
  json: 'json',
  json5: 'json',
  css: 'css',
  scss: 'scss',
  html: 'html',
  xml: 'xml',
  mjml: 'html',
  md: 'markdown',
  mdx: 'markdown',
  markdown: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'shell',
  bash: 'shell',
  shell: 'shell',
  zsh: 'shell',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  dockerfile: 'dockerfile',
};

/** Reads `language-ts` off a fenced block's <code> and maps it to a Monaco mode. */
export function monacoLanguage(className?: string): string {
  const tag = /language-([\w-]+)/.exec(className ?? '')?.[1]?.toLowerCase() ?? '';
  return MONACO_BY_TAG[tag] ?? 'plaintext';
}

/** The tag as written in the doc, for the block's badge. Empty when untagged. */
export function fenceTag(className?: string): string {
  return /language-([\w-]+)/.exec(className ?? '')?.[1]?.toLowerCase() ?? '';
}
