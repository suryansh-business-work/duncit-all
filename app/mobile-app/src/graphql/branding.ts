import { gql } from '@/generated/graphql';

/**
 * Branding query — the SAME server `branding` setting mWeb's <AuthLogo/> reads,
 * so the logo + app name on the mobile auth screens come from one common source
 * (rule: "logo se lekar design sab common jagah se aana chahiye"). Typed via
 * codegen (rule 13).
 */
export const BrandingDocument = gql(`
  query MobileBranding {
    branding {
      app_name
      logo_url
      primary_color
      mobile_favicon_url
      mobile_logo_url
      mobile_splash_url
      mobile_splash_type
      venues_card_video_url
      home_all_vibe_icon_url
      home_header_tagline
    }
  }
`);
