import { gql } from '@apollo/client';
import type {
  CrmEmailBrandAsset as GqlBrandAsset,
  CrmEmailFontOption as GqlFontOption,
  CrmEmailTheme as GqlTheme,
} from '@duncit/gql-types';

/** CRM › Email Templates › Settings — brand library, theme and the AI writer's prompts. */

/** The generated schema types, as the queries below select them. */
export type { CrmEmailAssetKind, CrmEmailColorMode } from '@duncit/gql-types';
export type CrmEmailBrandAsset = Omit<GqlBrandAsset, '__typename'>;
export type CrmEmailTheme = Omit<GqlTheme, '__typename'>;
export type CrmEmailFontOption = Omit<GqlFontOption, '__typename'>;

export interface CrmEmailSettings {
  assets: CrmEmailBrandAsset[];
  primary_logo_id?: string | null;
  theme: CrmEmailTheme;
  defaults: CrmEmailTheme;
  fonts: CrmEmailFontOption[];
  updated_at?: string | null;
}

export interface CrmEmailAiPrompt {
  id: string;
  key: string;
  role: 'SYSTEM' | 'USER';
  name: string;
  description: string;
  content: string;
  variables: { name: string; label: string; description: string; required: boolean }[];
  updated_at: string | null;
}

const THEME_FIELDS = `
  primary_color accent_color heading_color text_color muted_color background_color card_color panel_color
  border_color body_font heading_font base_font_size content_padding button_radius panel_radius color_mode
  dark_background_color dark_card_color dark_heading_color dark_text_color dark_primary_color
`;

const SETTINGS_FIELDS = `
  assets { id kind url name mime_type size_bytes width height created_at }
  primary_logo_id
  theme { ${THEME_FIELDS} }
  defaults { ${THEME_FIELDS} }
  fonts { key label stack }
  updated_at
`;

const PROMPT_FIELDS = 'id key role name description content variables { name label description required } updated_at';

export const CRM_EMAIL_SETTINGS = gql`
  query CrmEmailSettings {
    crmEmailSettings { ${SETTINGS_FIELDS} }
  }
`;

export const CRM_EMAIL_STARTER = gql`
  query CrmEmailStarterMjml {
    crmEmailStarterMjml
  }
`;

export const CRM_EMAIL_AI_PROMPTS = gql`
  query CrmEmailAiPrompts {
    crmEmailAiPrompts { ${PROMPT_FIELDS} }
  }
`;

export const RENDER_CRM_EMAIL_THEME_PREVIEW = gql`
  query RenderCrmEmailThemePreview($theme: CrmEmailThemeInput!, $mjml: String) {
    renderCrmEmailThemePreview(theme: $theme, mjml: $mjml) {
      html
      errors
    }
  }
`;

export const UPDATE_CRM_EMAIL_THEME = gql`
  mutation UpdateCrmEmailTheme($input: CrmEmailThemeInput!) {
    updateCrmEmailTheme(input: $input) { ${SETTINGS_FIELDS} }
  }
`;

export const RESET_CRM_EMAIL_THEME = gql`
  mutation ResetCrmEmailTheme {
    resetCrmEmailTheme { ${SETTINGS_FIELDS} }
  }
`;

export const ADD_CRM_EMAIL_BRAND_ASSETS = gql`
  mutation AddCrmEmailBrandAssets($items: [CrmEmailBrandAssetInput!]!) {
    addCrmEmailBrandAssets(items: $items) { ${SETTINGS_FIELDS} }
  }
`;

export const UPDATE_CRM_EMAIL_BRAND_ASSET = gql`
  mutation UpdateCrmEmailBrandAsset($id: ID!, $input: CrmEmailBrandAssetUpdateInput!) {
    updateCrmEmailBrandAsset(id: $id, input: $input) { ${SETTINGS_FIELDS} }
  }
`;

export const REMOVE_CRM_EMAIL_BRAND_ASSET = gql`
  mutation RemoveCrmEmailBrandAsset($id: ID!) {
    removeCrmEmailBrandAsset(id: $id) { ${SETTINGS_FIELDS} }
  }
`;

export const SET_CRM_EMAIL_PRIMARY_LOGO = gql`
  mutation SetCrmEmailPrimaryLogo($id: ID) {
    setCrmEmailPrimaryLogo(id: $id) { ${SETTINGS_FIELDS} }
  }
`;

export const UPDATE_CRM_EMAIL_AI_PROMPT = gql`
  mutation UpdateCrmEmailAiPrompt($key: String!, $content: String!) {
    updateCrmEmailAiPrompt(key: $key, content: $content) { ${PROMPT_FIELDS} }
  }
`;

export const RESET_CRM_EMAIL_AI_PROMPT = gql`
  mutation ResetCrmEmailAiPrompt($key: String!) {
    resetCrmEmailAiPrompt(key: $key) { ${PROMPT_FIELDS} }
  }
`;

export const GENERATE_CRM_EMAIL_MJML = gql`
  mutation GenerateCrmEmailMjml($input: CrmEmailAiInput!) {
    generateCrmEmailMjml(input: $input)
  }
`;
