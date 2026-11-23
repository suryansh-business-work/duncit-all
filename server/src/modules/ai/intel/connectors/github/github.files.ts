/**
 * Which repository files are worth indexing. Generated, vendored, binary and
 * lock files are skipped; documentation and source code are kept, the latter
 * chunked by line ranges so answers can cite exact lines.
 */

const SKIP_DIRS = /(^|\/)(node_modules|dist|build|out|coverage|\.git|\.next|\.turbo|vendor|\.expo|android\/app\/build|ios\/Pods|__snapshots__|generated)(\/|$)/;
const SKIP_FILES = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|.*\.min\.(js|css)|.*\.map|.*\.snap)$/i;
const DOC_EXT = /\.(md|mdx|txt|rst|adoc)$/i;
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|ya?ml|graphql|gql|css|scss|html|astro|py|go|rs|java|kt|swift|sh|sql|tf|toml|dockerfile|conf)$/i;

export type FileKind = 'doc' | 'code' | null;

export function fileKind(path: string): FileKind {
  if (SKIP_DIRS.test(path) || SKIP_FILES.test(path)) return null;
  if (DOC_EXT.test(path) || /(^|\/)README$/i.test(path)) return 'doc';
  if (CODE_EXT.test(path) || /(^|\/)Dockerfile$/i.test(path)) return 'code';
  return null;
}

/** GitHub tarball entries start with `<owner>-<repo>-<sha>/`; drop that segment. */
export const stripRoot = (path: string): string => path.slice(path.indexOf('/') + 1);

/** A file that is mostly NUL bytes or invalid UTF-8 is binary, whatever its name says. */
export function looksBinary(data: Buffer): boolean {
  const sample = data.subarray(0, 4000);
  let zeros = 0;
  for (const byte of sample) if (byte === 0) zeros += 1;
  return zeros > 0;
}
