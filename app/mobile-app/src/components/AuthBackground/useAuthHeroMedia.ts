import { useBranding } from '@/hooks/useBranding';

/**
 * The admin's login image and video (Branding > Login background). A hero is
 * its switch AND its asset — an admin who turns one off keeps the URL they
 * picked, so the URL alone must not draw anything. Video wins when both are
 * on, the same precedence mWeb applies (rule 27).
 */
export function useAuthHeroMedia(): { videoUrl: string; imageUrl: string; hasHero: boolean } {
  const { data } = useBranding();
  const branding = data?.branding;
  const videoUrl = branding?.login_background_video_enabled
    ? (branding?.login_background_video_url ?? '')
    : '';
  const imageUrl = branding?.login_background_image_enabled
    ? (branding?.login_background_image_url ?? '')
    : '';
  return { videoUrl, imageUrl, hasHero: Boolean(videoUrl || imageUrl) };
}
