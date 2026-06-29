/** Reconcile a pod's cached likers with the viewer's own optimistic like, so a
 * just-liked pod shows the viewer instead of a stale "No likes yet", and an
 * un-liked pod drops the viewer (explore item 8 / review fix). */
export function likersWithViewer(ids: string[], viewerId: string | null, liked: boolean): string[] {
  if (!viewerId) return ids;
  const has = ids.includes(viewerId);
  if (liked && !has) return [...ids, viewerId];
  if (!liked && has) return ids.filter((id) => id !== viewerId);
  return ids;
}
