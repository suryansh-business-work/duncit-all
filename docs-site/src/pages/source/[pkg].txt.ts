import type { APIRoute, GetStaticPaths } from 'astro';

/**
 * Serves a package's `docs/index.mdx` verbatim, frontmatter included.
 *
 * It backs the "Open docs/index.mdx" button on every package page: the same
 * Monaco that opens a snippet also opens the file that snippet lives in, so
 * whoever is about to edit the docs can read, tidy and copy the real source
 * without leaving the page they noticed the problem on.
 *
 * The text comes from `import.meta.glob(..., '?raw')` rather than `node:fs`.
 * Vite resolves that at build time into the output, so the endpoint never
 * depends on a working directory or on `dist/` keeping the source tree's shape
 * — both of which are true in dev and quietly false in a built bundle.
 */
const SOURCES = import.meta.glob<string>('../../../../packages/*/docs/index.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** `../../../../packages/regex/docs/index.mdx` → `regex`. */
function packageDir(path: string): string {
  return path.split('/packages/')[1].split('/')[0];
}

export const getStaticPaths: GetStaticPaths = () =>
  Object.keys(SOURCES).map((path) => ({ params: { pkg: packageDir(path) } }));

export const GET: APIRoute = ({ params }) => {
  const found = Object.entries(SOURCES).find(([path]) => packageDir(path) === params.pkg);
  if (!found) return new Response('Not found', { status: 404 });

  return new Response(found[1], {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};
