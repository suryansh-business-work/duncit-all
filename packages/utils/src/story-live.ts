/**
 * Whether a story is still inside its 24-hour life.
 *
 * The server's list queries already exclude expired stories and a Mongo TTL
 * index eventually deletes them — this is the CLIENT's half of the contract,
 * for the story that crosses its boundary while a screen stays open or is
 * served from a cache. `null` means a permanent post (not a story) and an
 * unparseable timestamp trusts the server filter rather than hiding content.
 */
export function isStoryLive(expiresAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!expiresAt) return true;
  const t = new Date(expiresAt).getTime();
  return Number.isNaN(t) ? true : t > now;
}
