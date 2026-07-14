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

  extend type Query {
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
  }
`;
