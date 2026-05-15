import { gql } from '@apollo/client';

export const BRANDING_FIELDS = `
  app_name
  logo_url
  primary_color
  support_email
  mascot_name
  mascot_description_html
  mascot_lottie_url
  mascot_on_chair_lottie_url
  mascot_winner_lottie_url
  welcome_lottie_url
  app_loader_lottie_url
  confetti_lottie_url
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

export interface BrandingFormState {
  app_name: string;
  logo_url: string;
  primary_color: string;
  support_email: string;
  mascot_name: string;
  mascot_description_html: string;
  mascot_lottie_url: string;
  mascot_on_chair_lottie_url: string;
  mascot_winner_lottie_url: string;
  welcome_lottie_url: string;
  app_loader_lottie_url: string;
  confetti_lottie_url: string;
}

export const emptyBrandingForm: BrandingFormState = {
  app_name: '',
  logo_url: '',
  primary_color: '#1976d2',
  support_email: '',
  mascot_name: 'Dunko',
  mascot_description_html: '',
  mascot_lottie_url: '',
  mascot_on_chair_lottie_url: '',
  mascot_winner_lottie_url: '',
  welcome_lottie_url: '',
  app_loader_lottie_url: '',
  confetti_lottie_url: '',
};
