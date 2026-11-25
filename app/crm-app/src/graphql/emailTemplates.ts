import { gql } from '@/generated/graphql';

/**
 * CRM › Email Templates — the portal pages' own operations: the templates
 * table, one template, its MJML render, create / save / delete, a test send,
 * its image library, the AI writer, and Settings (brand library, theme and the
 * AI writer's prompts).
 */
export const CrmAppEmailTemplateListDocument = gql(`
  query CrmAppEmailTemplateList($query: TableQueryInput) {
    crmEmailTemplatesTable(query: $query) {
      total
      rows { template_id slug name subject target is_active updated_at }
    }
  }
`);

export const CrmAppEmailTemplateDetailDocument = gql(`
  query CrmAppEmailTemplateDetail($id: ID!) {
    crmEmailTemplate(template_id: $id) {
      template_id slug name description subject target mjml is_active
      variables { key description sample }
      images { url name }
      attachments { url name }
    }
  }
`);

export const CrmAppEmailTemplateRenderDocument = gql(`
  query CrmAppEmailTemplateRender($mjml: String!, $vars: String) {
    renderCrmEmailTemplate(mjml: $mjml, vars: $vars) { html errors detected_variables }
  }
`);

export const CrmAppEmailTemplateStarterDocument = gql(`
  query CrmAppEmailTemplateStarter {
    crmEmailStarterMjml
  }
`);

export const CrmAppEmailTemplateCreateDocument = gql(`
  mutation CrmAppEmailTemplateCreate($input: CreateCrmEmailTemplateInput!) {
    createCrmEmailTemplate(input: $input) { template_id }
  }
`);

export const CrmAppEmailTemplateUpdateDocument = gql(`
  mutation CrmAppEmailTemplateUpdate($id: ID!, $input: UpdateCrmEmailTemplateInput!) {
    updateCrmEmailTemplate(template_id: $id, input: $input) { template_id }
  }
`);

export const CrmAppEmailTemplateDeleteDocument = gql(`
  mutation CrmAppEmailTemplateDelete($id: ID!) {
    deleteCrmEmailTemplate(template_id: $id)
  }
`);

export const CrmAppEmailTemplateSendTestDocument = gql(`
  mutation CrmAppEmailTemplateSendTest($id: ID!, $to: String!, $vars: String) {
    sendCrmTestEmail(template_id: $id, to: $to, vars: $vars) { ok message }
  }
`);

export const CrmAppEmailTemplateAddImageDocument = gql(`
  mutation CrmAppEmailTemplateAddImage($id: ID!, $image: CrmEmailAssetInput!) {
    addCrmEmailTemplateImage(template_id: $id, image: $image) { template_id images { url name } }
  }
`);

export const CrmAppEmailTemplateRemoveImageDocument = gql(`
  mutation CrmAppEmailTemplateRemoveImage($id: ID!, $url: String!) {
    removeCrmEmailTemplateImage(template_id: $id, url: $url) { template_id images { url name } }
  }
`);

export const CrmAppEmailTemplateGenerateMjmlDocument = gql(`
  mutation CrmAppEmailTemplateGenerateMjml($input: CrmEmailAiInput!) {
    generateCrmEmailMjml(input: $input)
  }
`);

/** Settings: the brand library, the theme (and the defaults Reset restores) and the font choices. */
export const CrmAppEmailTemplateSettingsDocument = gql(`
  query CrmAppEmailTemplateSettings {
    crmEmailSettings { ...CrmAppEmailTemplateSettingsFields }
  }
  fragment CrmAppEmailTemplateTheme on CrmEmailTheme {
    primary_color accent_color heading_color text_color muted_color background_color card_color panel_color
    border_color body_font heading_font base_font_size content_padding button_radius panel_radius color_mode
    dark_background_color dark_card_color dark_heading_color dark_text_color dark_primary_color
  }
  fragment CrmAppEmailTemplateSettingsFields on CrmEmailSettings {
    assets { id kind url name mime_type size_bytes width height }
    primary_logo_id
    theme { ...CrmAppEmailTemplateTheme }
    defaults { ...CrmAppEmailTemplateTheme }
    fonts { key label }
  }
`);

export const CrmAppEmailTemplateThemePreviewDocument = gql(`
  query CrmAppEmailTemplateThemePreview($theme: CrmEmailThemeInput!) {
    renderCrmEmailThemePreview(theme: $theme) { html errors }
  }
`);

export const CrmAppEmailTemplateUpdateThemeDocument = gql(`
  mutation CrmAppEmailTemplateUpdateTheme($input: CrmEmailThemeInput!) {
    updateCrmEmailTheme(input: $input) { ...CrmAppEmailTemplateSettingsFields }
  }
`);

export const CrmAppEmailTemplateAddBrandAssetsDocument = gql(`
  mutation CrmAppEmailTemplateAddBrandAssets($items: [CrmEmailBrandAssetInput!]!) {
    addCrmEmailBrandAssets(items: $items) { ...CrmAppEmailTemplateSettingsFields }
  }
`);

export const CrmAppEmailTemplateUpdateBrandAssetDocument = gql(`
  mutation CrmAppEmailTemplateUpdateBrandAsset($id: ID!, $input: CrmEmailBrandAssetUpdateInput!) {
    updateCrmEmailBrandAsset(id: $id, input: $input) { ...CrmAppEmailTemplateSettingsFields }
  }
`);

export const CrmAppEmailTemplateRemoveBrandAssetDocument = gql(`
  mutation CrmAppEmailTemplateRemoveBrandAsset($id: ID!) {
    removeCrmEmailBrandAsset(id: $id) { ...CrmAppEmailTemplateSettingsFields }
  }
`);

export const CrmAppEmailTemplateSetPrimaryLogoDocument = gql(`
  mutation CrmAppEmailTemplateSetPrimaryLogo($id: ID) {
    setCrmEmailPrimaryLogo(id: $id) { ...CrmAppEmailTemplateSettingsFields }
  }
`);

export const CrmAppEmailTemplateAiPromptsDocument = gql(`
  query CrmAppEmailTemplateAiPrompts {
    crmEmailAiPrompts { id key role content variables { name label description required } }
  }
`);

export const CrmAppEmailTemplateUpdateAiPromptDocument = gql(`
  mutation CrmAppEmailTemplateUpdateAiPrompt($key: String!, $content: String!) {
    updateCrmEmailAiPrompt(key: $key, content: $content) { id }
  }
`);

export const CrmAppEmailTemplateResetAiPromptDocument = gql(`
  mutation CrmAppEmailTemplateResetAiPrompt($key: String!) {
    resetCrmEmailAiPrompt(key: $key) { id }
  }
`);
