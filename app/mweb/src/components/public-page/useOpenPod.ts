import { useNavigate } from 'react-router';
import { podUrl } from '../../utils/seoUrls';

/**
 * Opens a pod from a public page. The pod page is sign-in only, so a signed-out
 * visitor is parked on login with this pod as `?redirect` (and sees it on top
 * of every auth step); a signed-in one goes straight to it.
 */
export function useOpenPod() {
  const navigate = useNavigate();
  return (pod: Readonly<{ club_slug?: string | null; pod_id?: string | null }>) => {
    if (pod.club_slug && pod.pod_id) navigate(podUrl(pod.club_slug, pod.pod_id));
  };
}
