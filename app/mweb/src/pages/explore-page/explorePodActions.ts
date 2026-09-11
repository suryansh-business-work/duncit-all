import { shareUrl } from '../../lib/share-link';

/** Reconcile the cached likers with the viewer's own optimistic like so a
 * just-liked pod shows the viewer instead of a stale "No likes yet". */
export function likersWithViewer(ids: string[], viewerId: string | null | undefined, liked: boolean): string[] {
  if (!viewerId) return ids;
  const has = ids.includes(viewerId);
  if (liked && !has) return [...ids, viewerId];
  if (!liked && has) return ids.filter((id) => id !== viewerId);
  return ids;
}

/** Share a reel's pod through the native sheet, or copy its link. */
export async function shareExplorePod(pod: any): Promise<void> {
  const podUrl = pod.club_slug && pod.pod_id
    ? `${globalThis.window.location.origin}/club/${pod.club_slug}/pod/${pod.pod_id}`
    : `${globalThis.window.location.origin}/explore`;
  // Tracked through Short Links, so a pod passed around from Explore is
  // measured the same way a promoted one is.
  const url = await shareUrl('POD', pod.id, podUrl);
  const shareData = {
    title: pod.pod_title,
    text: pod.pod_description?.slice(0, 100) ?? pod.pod_title,
    url,
  };
  try {
    if (navigator.share) await navigator.share(shareData);
    else await navigator.clipboard.writeText(url);
  } catch {
    /* user cancelled */
  }
}
