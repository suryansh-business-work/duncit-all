import gql from 'graphql-tag';

export const crmEmailTemplateTypeDefs = gql`
  type CrmEmailTemplateVariable {
    key: String!
    description: String
    sample: String
  }
  input CrmEmailTemplateVariableInput {
    key: String!
    description: String
    sample: String
  }

  "An uploaded asset (image-library entry or send attachment) addressed by URL."
  type CrmEmailAsset {
    url: String!
    name: String
  }
  input CrmEmailAssetInput {
    url: String!
    name: String
  }

  enum CrmEmailTemplateTarget {
    VENUE
    HOST
    ECOMM
    STATIC
  }

  "A CRM-owned email template (separate store from core/admin templates)."
  type CrmEmailTemplate {
    template_id: ID!
    slug: String!
    name: String!
    description: String
    subject: String!
    target: CrmEmailTemplateTarget!
    mjml: String!
    variables: [CrmEmailTemplateVariable!]!
    images: [CrmEmailAsset!]!
    attachments: [CrmEmailAsset!]!
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  input CreateCrmEmailTemplateInput {
    slug: String!
    name: String!
    description: String
    subject: String!
    target: CrmEmailTemplateTarget
    mjml: String!
    variables: [CrmEmailTemplateVariableInput!]
    images: [CrmEmailAssetInput!]
    attachments: [CrmEmailAssetInput!]
    is_active: Boolean
  }

  input UpdateCrmEmailTemplateInput {
    name: String
    description: String
    subject: String
    target: CrmEmailTemplateTarget
    mjml: String
    variables: [CrmEmailTemplateVariableInput!]
    images: [CrmEmailAssetInput!]
    attachments: [CrmEmailAssetInput!]
    is_active: Boolean
  }

  "Server-side table page for the shared table engine (crmEmailTemplatesTable)."
  type CrmEmailTemplateTablePage {
    rows: [CrmEmailTemplate!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type CrmEmailTemplateRender {
    html: String!
    errors: [String!]!
    detected_variables: [String!]!
  }

  type CrmEmailTestResult {
    ok: Boolean!
    message: String
  }

  enum CrmEmailAssetKind {
    LOGO
    BANNER
    IMAGE
  }

  enum CrmEmailColorMode {
    "Follow the reader's mail app: light or the designed dark palette."
    AUTO
    "Always light, even when the reader's mail app is dark."
    LIGHT
  }

  "A logo, banner or image in the CRM email brand library (Email Templates › Settings)."
  type CrmEmailBrandAsset {
    id: ID!
    kind: CrmEmailAssetKind!
    url: String!
    name: String!
    mime_type: String!
    size_bytes: Int
    width: Int
    height: Int
    created_at: String
  }

  "The CRM email look. Colours are #rrggbb; sizes are pixels."
  type CrmEmailTheme {
    primary_color: String!
    accent_color: String!
    heading_color: String!
    text_color: String!
    muted_color: String!
    background_color: String!
    card_color: String!
    panel_color: String!
    border_color: String!
    body_font: String!
    heading_font: String!
    base_font_size: Int!
    content_padding: Int!
    button_radius: Int!
    panel_radius: Int!
    color_mode: CrmEmailColorMode!
    dark_background_color: String!
    dark_card_color: String!
    dark_heading_color: String!
    dark_text_color: String!
    dark_primary_color: String!
  }

  type CrmEmailFontOption {
    key: String!
    label: String!
    stack: String!
  }

  type CrmEmailSettings {
    assets: [CrmEmailBrandAsset!]!
    "The logo CRM emails show in their header; null = the Duncit brand logo."
    primary_logo_id: ID
    theme: CrmEmailTheme!
    "The shared design tokens — what Reset restores."
    defaults: CrmEmailTheme!
    fonts: [CrmEmailFontOption!]!
    updated_at: String
  }

  input CrmEmailThemeInput {
    primary_color: String
    accent_color: String
    heading_color: String
    text_color: String
    muted_color: String
    background_color: String
    card_color: String
    panel_color: String
    border_color: String
    body_font: String
    heading_font: String
    base_font_size: Int
    content_padding: Int
    button_radius: Int
    panel_radius: Int
    color_mode: CrmEmailColorMode
    dark_background_color: String
    dark_card_color: String
    dark_heading_color: String
    dark_text_color: String
    dark_primary_color: String
  }

  input CrmEmailBrandAssetInput {
    kind: CrmEmailAssetKind!
    url: String!
    name: String
    mime_type: String
    size_bytes: Int
    width: Int
    height: Int
  }

  "Rename, re-file or replace an asset. Send url (with its file fields) only to replace the file."
  input CrmEmailBrandAssetUpdateInput {
    kind: CrmEmailAssetKind
    name: String
    url: String
    mime_type: String
    size_bytes: Int
    width: Int
    height: Int
  }

  input CrmEmailAiInput {
    prompt: String!
    current_mjml: String
    target: CrmEmailTemplateTarget
  }

  extend type Query {
    "Brand library, theme and font options for CRM emails."
    crmEmailSettings: CrmEmailSettings!
    "The shared starter body a new CRM template begins from."
    crmEmailStarterMjml: String!
    "The two AI Library prompts behind the CRM email writer (SYSTEM, then USER)."
    crmEmailAiPrompts: [AiPrompt!]!
    "Render a template (the starter by default) under an unsaved theme, for the settings preview."
    renderCrmEmailThemePreview(theme: CrmEmailThemeInput!, mjml: String): CrmEmailTemplateRender!
    crmEmailTemplates: [CrmEmailTemplate!]!
    crmEmailTemplatesTable(query: TableQueryInput): CrmEmailTemplateTablePage!
    crmEmailTemplate(template_id: ID!): CrmEmailTemplate
    "Render MJML with sample vars for the editor preview (CRM store)."
    renderCrmEmailTemplate(mjml: String!, vars: String): CrmEmailTemplateRender!
  }

  extend type Mutation {
    createCrmEmailTemplate(input: CreateCrmEmailTemplateInput!): CrmEmailTemplate!
    updateCrmEmailTemplate(template_id: ID!, input: UpdateCrmEmailTemplateInput!): CrmEmailTemplate!
    deleteCrmEmailTemplate(template_id: ID!): Boolean!
    sendCrmTestEmail(template_id: ID!, to: String!, vars: String): CrmEmailTestResult!
    "Append an uploaded image to the template's library (persists immediately)."
    addCrmEmailTemplateImage(template_id: ID!, image: CrmEmailAssetInput!): CrmEmailTemplate!
    removeCrmEmailTemplateImage(template_id: ID!, url: String!): CrmEmailTemplate!
    updateCrmEmailTheme(input: CrmEmailThemeInput!): CrmEmailSettings!
    "Put the theme back on the shared design tokens."
    resetCrmEmailTheme: CrmEmailSettings!
    addCrmEmailBrandAssets(items: [CrmEmailBrandAssetInput!]!): CrmEmailSettings!
    updateCrmEmailBrandAsset(id: ID!, input: CrmEmailBrandAssetUpdateInput!): CrmEmailSettings!
    removeCrmEmailBrandAsset(id: ID!): CrmEmailSettings!
    "Pick the header logo for CRM emails; omit id to use the Duncit brand logo again."
    setCrmEmailPrimaryLogo(id: ID): CrmEmailSettings!
    "Edit one of the CRM email writer prompts (crm.email_mjml or crm.email_mjml.user)."
    updateCrmEmailAiPrompt(key: String!, content: String!): AiPrompt!
    resetCrmEmailAiPrompt(key: String!): AiPrompt!
    "Write or rework a CRM template with AI, using the CRM prompts and brand images."
    generateCrmEmailMjml(input: CrmEmailAiInput!): String!
  }
`;
