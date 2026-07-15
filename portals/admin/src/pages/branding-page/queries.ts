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
  website_header_logo_url
  website_footer_logo_url
  website_favicon_url
  android_app_url
  ios_app_url
  home_all_vibe_icon_url
  home_header_tagline
  updated_at
`;

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
  website_header_logo_url: string;
  website_footer_logo_url: string;
  website_favicon_url: string;
  android_app_url: string;
  ios_app_url: string;
  home_all_vibe_icon_url: string;
  home_header_tagline: string;
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
  website_header_logo_url: '',
  website_footer_logo_url: '',
  website_favicon_url: '',
  android_app_url: '',
  ios_app_url: '',
  home_all_vibe_icon_url: '',
  home_header_tagline: 'It All Starts Here!',
};
