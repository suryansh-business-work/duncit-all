/**
 * Every shared package's documentation, read straight from the packages.
 *
 * The prose lives in `packages/<name>/docs/index.mdx` beside the code it
 * describes, and the docs site collects the same files. This page collects them
 * too rather than restating anything: a second copy of a package's docs would be
 * wrong within a week, and the whole point of those files sitting next to their
 * package is that they move with it.
 *
 * `?raw` + `eager` means the markdown is compiled into the bundle at build time,
 * so the portal needs no endpoint and no filesystem at runtime. The Docker build
 * copies the whole `packages` tree, so the glob resolves there too.
 */
const RAW = import.meta.glob('../../../../../packages/*/docs/index.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** The frontmatter the docs site validates, plus the body below it. */
export interface PackageDoc {
  /** Folder name under packages/, e.g. `communication`. */
  slug: string;
  /** Published name, e.g. `@duncit/communication`. */
  name: string;
  summary: string;
  category: string;
  zeroDeps: boolean;
  frameworkFree: boolean;
  coverageGate: boolean;
  consumers: string[];
  exports: string[];
  /** The markdown under the frontmatter. */
  body: string;
}

type FrontmatterValue = string | boolean | string[];

const BOOL_KEYS = new Set(['zeroDeps', 'frameworkFree', 'coverageGate']);
const LIST_KEYS = new Set(['consumers', 'exports']);
const FENCE = '---';

const unquote = (value: string) => value.trim().replace(/^['"]/, '').replace(/['"]$/, '');

/**
 * The frontmatter these files actually use — scalars, booleans and dash lists.
 *
 * Not a YAML parser, and it must not become one: the shape is fixed by the docs
 * site's zod schema, which fails the build the moment a file strays from it.
 * Split on lines rather than matched with a pattern, so a 500-line doc costs one
 * pass instead of a regex that backtracks over the whole body.
 */
function parseFrontmatter(raw: string): { data: Record<string, FrontmatterValue>; body: string } {
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== FENCE) return { data: {}, body: raw };
  const end = lines.indexOf(FENCE, 1);
  if (end === -1) return { data: {}, body: raw };

  const data: Record<string, FrontmatterValue> = {};
  let listKey = '';
  for (const line of lines.slice(1, end)) {
    const trimmed = line.trim();
    if (listKey && trimmed.startsWith('- ')) {
      (data[listKey] as string[]).push(unquote(trimmed.slice(2)));
      continue;
    }
    const colon = trimmed.indexOf(':');
    if (colon <= 0) continue;
    const key = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1);
    if (LIST_KEYS.has(key)) {
      data[key] = [];
      listKey = key;
      continue;
    }
    listKey = '';
    if (BOOL_KEYS.has(key)) data[key] = unquote(value) === 'true';
    else data[key] = unquote(value);
  }
  return { data, body: lines.slice(end + 1).join('\n') };
}

const str = (data: Record<string, FrontmatterValue>, key: string, fallback: string): string =>
  typeof data[key] === 'string' ? data[key] : fallback;

const list = (data: Record<string, FrontmatterValue>, key: string): string[] =>
  Array.isArray(data[key]) ? data[key] : [];

/**
 * Every doc opens with `# @duncit/<name>`, and the card above the prose already
 * says that. Two identical titles read as two different things, so the body's
 * own is dropped — but only when it IS the name.
 */
function stripTitle(body: string, name: string): string {
  const trimmed = body.trimStart();
  const heading = `# ${name}`;
  if (!trimmed.startsWith(heading)) return body;
  return trimmed.slice(heading.length).trimStart();
}

function toDoc(path: string, raw: string): PackageDoc {
  const slug = /packages\/([^/]+)\/docs/.exec(path.replaceAll('\\', '/'))?.[1] ?? path;
  const { data, body } = parseFrontmatter(raw);
  const name = str(data, 'name', `@duncit/${slug}`);
  return {
    slug,
    name,
    summary: str(data, 'summary', ''),
    category: str(data, 'category', 'other'),
    zeroDeps: data.zeroDeps === true,
    frameworkFree: data.frameworkFree === true,
    coverageGate: data.coverageGate === true,
    consumers: list(data, 'consumers'),
    exports: list(data, 'exports'),
    body: stripTitle(body, name),
  };
}

/** Every documented package, by name. */
export const PACKAGE_DOCS: PackageDoc[] = Object.entries(RAW)
  .map(([path, raw]) => toDoc(path, raw))
  .sort((a, b) => a.name.localeCompare(b.name));

