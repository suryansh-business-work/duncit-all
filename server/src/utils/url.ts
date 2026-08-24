/**
 * URL shaping the whole server shares.
 *
 * Every base here is admin-configured and almost every mail body pastes a path
 * onto one, so "the base, minus its trailing slashes" is asked for in two dozen
 * places. Most of them match it with `/\/+$/`, which backtracks super-linearly
 * on a pathological input (Sonar S8786) — and three separate files had already
 * hand-written the walked version to avoid exactly that, each with its own name
 * and its own comment explaining the same thing. This is that helper, once
 * (rule 40).
 */
export function trimTrailingSlash(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
}

/** A configured base with `path` under it, with exactly one slash between. */
export function joinUrl(base: string, path: string): string {
  const root = trimTrailingSlash(base);
  if (!path) return root;
  return path.startsWith('/') ? `${root}${path}` : `${root}/${path}`;
}
