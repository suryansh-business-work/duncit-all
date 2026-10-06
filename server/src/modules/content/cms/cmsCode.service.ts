import { createHash } from 'node:crypto';
import { parse as parseJs } from 'acorn';
import * as sass from 'sass';
import { badInput } from './cms.mappers';

/**
 * The Website CMS's code: every stylesheet is SCSS, compiled here, and every
 * component's stylesheet is SCOPED to that component — wrapped in
 * `[data-cms-fragment="<key>"] { … }` before compiling — so it can never reach
 * past the component, while the site's and a page's own CSS stay global.
 *
 * Validation runs here too (the portal asks as you type, and every save asks
 * again): SCSS through Dart Sass, JavaScript parsed — never run — by acorn, and
 * Astro through the Astro compiler. A CMS component renders its MARKUP, so in
 * Astro code the frontmatter and `{expressions}` (which need a build to run)
 * are reported as errors instead of silently dropped.
 */

export const CMS_CODE_LANGUAGES = ['SCSS', 'JS', 'ASTRO', 'HTML'] as const;
export type CmsCodeLanguage = (typeof CMS_CODE_LANGUAGES)[number];

export interface CmsCodeProblem {
  line: number;
  column: number;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

/** Compiled CSS by source hash: renders repeat the same few stylesheets. */
const CACHE_LIMIT = 400;
const compiled = new Map<string, string>();

/** `@use` / `@forward` must open a stylesheet, so they stay outside a component's scope. */
const MODULE_RULE = /^\s*@(?:use|forward)\b/;

export const componentScope = (key: string) => `[data-cms-fragment="${key}"]`;

/** The stylesheet as Sass sees it, and how many lines were added in front of the author's first line. */
function wrap(source: string, scope?: string): { text: string; offset: number } {
  if (!scope) return { text: source, offset: 0 };
  const lines = source.split('\n');
  const modules = lines.filter((line) => MODULE_RULE.test(line));
  const body = lines.map((line) => (MODULE_RULE.test(line) ? '' : line));
  // The modules sit above the scope line, so the author's line N becomes N + modules + 1.
  return { text: `${modules.join('\n')}${modules.length ? '\n' : ''}${scope} {\n${body.join('\n')}\n}`, offset: modules.length + 1 };
}

/** A Dart Sass failure as an editor problem. Anything else is not a code problem, and is rethrown. */
function sassProblem(error: unknown, offset: number): CmsCodeProblem {
  if (!(error instanceof sass.Exception)) throw error;
  return {
    // An error on a hoisted @use line sits above the author's first line: it is line 1.
    line: Math.max(1, error.span.start.line + 1 - offset),
    column: error.span.start.column + 1,
    message: error.sassMessage,
    severity: 'ERROR',
  };
}

function remember(key: string, css: string): string {
  // Maps keep insertion order: the first key is the oldest.
  if (compiled.size >= CACHE_LIMIT) for (const oldest of compiled.keys()) {
    compiled.delete(oldest);
    break;
  }
  compiled.set(key, css);
  return css;
}

/** SCSS to CSS (scoped when `scope` is given). Throws a BAD_USER_INPUT naming the line on invalid code. */
export function compileScss(source: string, scope?: string): string {
  if (!source.trim()) return '';
  const cacheKey = createHash('sha256').update(`${scope ?? ''}\u0000${source}`).digest('hex');
  const hit = compiled.get(cacheKey);
  if (hit !== undefined) return hit;
  const { text, offset } = wrap(source, scope);
  try {
    return remember(cacheKey, sass.compileString(text, { style: 'compressed', logger: sass.Logger.silent }).css);
  } catch (error) {
    const problem = sassProblem(error, offset);
    throw badInput(`SCSS line ${problem.line}, column ${problem.column}: ${problem.message}`);
  }
}

/** For the live render: a stylesheet that somehow stopped compiling is served as written, never as an error page. */
export function compileScssOrRaw(source: string, scope?: string): string {
  try {
    return compileScss(source, scope);
  } catch {
    return source;
  }
}

function validateScss(source: string): CmsCodeProblem[] {
  if (!source.trim()) return [];
  try {
    sass.compileString(source, { style: 'compressed', logger: sass.Logger.silent });
    return [];
  } catch (error) {
    return [sassProblem(error, 0)];
  }
}

/** V8 parses the script without running it; a SyntaxError names its line in the stack. */
/** acorn's syntax errors carry where they happened; its column is 0-based. */
interface JsSyntaxError extends SyntaxError {
  loc: { line: number; column: number };
}

const isJsSyntaxError = (error: unknown): error is JsSyntaxError => error instanceof SyntaxError && 'loc' in error;

/** A parser, not an interpreter: the script is read, never run. */
function validateJs(source: string): CmsCodeProblem[] {
  if (!source.trim()) return [];
  try {
    parseJs(source, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true });
    return [];
  } catch (error) {
    if (!isJsSyntaxError(error)) throw error;
    return [{ line: error.loc.line, column: error.loc.column + 1, message: error.message, severity: 'ERROR' }];
  }
}

interface AstroNode {
  type?: string;
  start?: number;
  end?: number;
  program?: { body?: unknown[] };
  [key: string]: unknown;
}

const FRONTMATTER_CODE =
  'A CMS component renders its markup: frontmatter code needs a build and cannot run here. Use plain values, the component’s JS, or a live block.';
const FRONTMATTER_EMPTY = 'Remove the empty --- fences: a CMS component has no frontmatter, and they would show on the page.';
const EXPRESSION = 'A CMS component renders its markup: {expressions} need a build and cannot run here. Write the value itself.';

/** Why this node cannot render in a CMS component, or null when it can. (The parser emits an empty frontmatter node for plain markup.) */
function unsupported(n: AstroNode): string | null {
  if (n.type === 'JSXExpressionContainer') return EXPRESSION;
  if (n.type !== 'AstroFrontmatter' || (n.end ?? 0) <= (n.start ?? 0)) return null;
  return n.program?.body?.length ? FRONTMATTER_CODE : FRONTMATTER_EMPTY;
}

/** 1-based line and column of a character offset. */
function position(source: string, offset: number): { line: number; column: number } {
  const before = source.slice(0, Math.max(0, offset));
  const line = before.split('\n').length;
  return { line, column: offset - before.lastIndexOf('\n') };
}

/**
 * The Astro compiler is a native, ESM-only module: loaded on first use, so
 * nothing that merely imports this file (every server test, every boot path
 * that never validates Astro) pays for it or depends on it loading.
 */
async function validateAstro(source: string): Promise<CmsCodeProblem[]> {
  if (!source.trim()) return [];
  const { parse } = await import('@astrojs/compiler-rs');
  const { ast, diagnostics } = parse(source);
  const problems: CmsCodeProblem[] = diagnostics.map((d) => ({
    line: d.labels?.[0]?.line ?? 1,
    column: d.labels?.[0]?.column ?? 1,
    message: d.text,
    severity: d.severity === 'error' ? 'ERROR' : 'WARNING',
  }));
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as AstroNode;
    const message = unsupported(n);
    if (message) problems.push({ ...position(source, n.start ?? 0), message, severity: 'ERROR' });
    for (const value of Object.values(n)) walk(value);
  };
  walk(ast);
  return problems;
}

/** Every problem in one piece of code, for the editor's markers. */
export async function validateCode(language: CmsCodeLanguage, source: string): Promise<CmsCodeProblem[]> {
  switch (language) {
    case 'SCSS':
      return validateScss(source);
    case 'JS':
      return validateJs(source);
    case 'ASTRO':
      return validateAstro(source);
    default:
      return [];
  }
}

/** Refuses a save whose code would break the live site: the first problem, with its line. */
export async function assertValid(language: CmsCodeLanguage, source: string, what: string): Promise<void> {
  const problem = (await validateCode(language, source)).find((p) => p.severity === 'ERROR');
  if (problem) throw badInput(`${what} — line ${problem.line}, column ${problem.column}: ${problem.message}`);
}

/**
 * A component's script, run once per placement with `root` bound to that
 * placement — the JS twin of its scoped CSS. Errors stay inside the component.
 */
export function scopedScript(key: string, js: string): string {
  if (!js.trim()) return '';
  const selector = JSON.stringify(componentScope(key));
  return `document.querySelectorAll(${selector}).forEach(function (root) { try { ${js}\n} catch (error) { console.error('cms component failed', ${JSON.stringify(key)}, error); } });`;
}
