/**
 * Builds the canonical mWeb path for a club.
 * Falls back to home if the slug is missing (legacy data).
 */
export function clubUrl(slug?: string | null): string {
  return slug ? `/club/${slug}` : '/';
}

/**
 * Builds the canonical mWeb path for a pod. Pods are always namespaced
 * under their parent club, so both slugs are required.
 */
export function podUrl(
  clubSlug?: string | null,
  podSlug?: string | null
): string {
  if (clubSlug && podSlug) return `/club/${clubSlug}/pod/${podSlug}`;
  return '/';
}
