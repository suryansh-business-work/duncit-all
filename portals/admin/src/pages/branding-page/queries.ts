import { gql } from '@apollo/client';

export const BRANDING_FIELDS = `
  app_name
  logo_url
  primary_color
  support_email
  support_phone
  mweb_favicon_url
  mweb_logo_url
  mweb_splash_url
  mweb_splash_type
  mobile_favicon_url
  mobile_logo_url
  mobile_splash_url
  mobile_splash_type
  portals_favicon_url
  portals_logo_url
  portals_splash_url
  portals_splash_type
  login_background_image_enabled
  login_background_image_url
  login_background_video_enabled
  login_background_video_url
  website_header_logo_url
  website_footer_logo_url
  website_favicon_url
  android_app_url
  ios_app_url
  app_min_supported_version
  home_all_vibe_icon_url
  home_all_vibe_icon_layout {
    position
    width
    height
  }
  home_show_all_vibe_categories
  home_vibe_heading
  home_vibe_subheading
  home_header_tagline
  mobile_font_family
  mweb_font_family
  portals_font_family
  updated_at
`;

export const OCCASIONAL_ICON_FIELDS = `
  slug
  label
  starts_at
  ends_at
  icon_url
  fallback_icon
  is_active
  sort_order
`;

export const OCCASIONAL_ICONS = gql`
  query OccasionalIcons {
    branding {
      occasional_icons {
        ${OCCASIONAL_ICON_FIELDS}
      }
    }
  }
`;

export const UPDATE_OCCASIONAL_ICONS = gql`
  mutation UpdateOccasionalIcons($input: [OccasionalIconInput!]!) {
    updateOccasionalIcons(input: $input) {
      ${OCCASIONAL_ICON_FIELDS}
    }
  }
`;

export interface OccasionalIconRow {
  slug: string;
  label: string;
  starts_at: string;
  ends_at: string;
  icon_url: string;
  /** Bundled fallback-icon NAME used when icon_url is blank or fails. */
  fallback_icon: string;
  is_active: boolean;
  sort_order: number;
}

export const BRANDING = gql`
  query Branding {
    branding {
      ${BRANDING_FIELDS}
    }
  }
`;

export const UPDATE_BRANDING = gql`
  mutation UpdateBranding($input: UpdateBrandingInput!) {
    updateBranding(input: $input) {
      ${BRANDING_FIELDS}
    }
  }
`;

/** Per-platform asset fields repeated for mweb / mobile / portals. */
export interface PlatformAssetFields {
  favicon_url: string;
  logo_url: string;
  splash_url: string;
  splash_type: string;
}

export interface BrandingFormState {
  app_name: string;
  logo_url: string;
  primary_color: string;
  support_email: string;
  support_phone: string;
  mweb_favicon_url: string;
  mweb_logo_url: string;
  mweb_splash_url: string;
  mweb_splash_type: string;
  mobile_favicon_url: string;
  mobile_logo_url: string;
  mobile_splash_url: string;
  mobile_splash_type: string;
  portals_favicon_url: string;
  portals_logo_url: string;
  portals_splash_url: string;
  portals_splash_type: string;
  login_background_image_enabled: boolean;
  login_background_image_url: string;
  login_background_video_enabled: boolean;
  login_background_video_url: string;
  website_header_logo_url: string;
  website_footer_logo_url: string;
  website_favicon_url: string;
  android_app_url: string;
  ios_app_url: string;
  app_min_supported_version: string;
  home_all_vibe_icon_url: string;
  home_all_vibe_icon_layout: { position: string; width: number; height: number } | null;
  home_header_tagline: string;
  mobile_font_family: string;
  mweb_font_family: string;
  portals_font_family: string;
}

export type PlatformPrefix = 'mweb' | 'mobile' | 'portals';

export const emptyBrandingForm: BrandingFormState = {
  app_name: '',
  logo_url: '',
  primary_color: '#1976d2',
  support_email: '',
  support_phone: '',
  mweb_favicon_url: '',
  mweb_logo_url: '',
  mweb_splash_url: '',
  mweb_splash_type: 'IMAGE',
  mobile_favicon_url: '',
  mobile_logo_url: '',
  mobile_splash_url: '',
  mobile_splash_type: 'IMAGE',
  portals_favicon_url: '',
  portals_logo_url: '',
  portals_splash_url: '',
  portals_splash_type: 'IMAGE',
  login_background_image_enabled: false,
  login_background_image_url: '',
  login_background_video_enabled: false,
  login_background_video_url: '',
  website_header_logo_url: '',
  website_footer_logo_url: '',
  website_favicon_url: '',
  android_app_url: '',
  ios_app_url: '',
  app_min_supported_version: '',
  home_all_vibe_icon_url: '',
  home_all_vibe_icon_layout: null,
  home_header_tagline: 'It All Starts Here!',
  mobile_font_family: '',
  mweb_font_family: '',
  portals_font_family: '',
};
