export const emailTemplateTypeDefs = /* GraphQL */ `
  type EmailTemplateVariable {
    key: String!
    description: String
    sample: String
  }
  input EmailTemplateVariableInput {
    key: String!
    description: String
    sample: String
  }

  type EmailTemplate {
    template_id: ID!
    slug: String!
    name: String!
    description: String
    subject: String!
    mjml: String!
    variables: [EmailTemplateVariable!]!
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  input CreateEmailTemplateInput {
    slug: String!
    name: String!
    description: String
    subject: String!
    mjml: String!
    variables: [EmailTemplateVariableInput!]
    is_active: Boolean
  }

  input UpdateEmailTemplateInput {
    name: String
    description: String
    subject: String
    mjml: String
    variables: [EmailTemplateVariableInput!]
    is_active: Boolean
  }

  type EmailTemplateRender {
    subject: String!
    html: String!
    errors: [String!]!
    detected_variables: [String!]!
  }

  type EmailTestResult {
    ok: Boolean!
    message: String
  }

  extend type Query {
    emailTemplates: [EmailTemplate!]!
    emailTemplate(template_id: ID!): EmailTemplate
    emailTemplateBySlug(slug: String!): EmailTemplate
    """
    Render the given MJML with sample variables, returning the HTML and any
    MJML compile errors. Used for the right-hand preview in the editor.
    """
    renderEmailTemplate(mjml: String!, vars: String): EmailTemplateRender!
  }

  extend type Mutation {
    createEmailTemplate(input: CreateEmailTemplateInput!): EmailTemplate!
    updateEmailTemplate(template_id: ID!, input: UpdateEmailTemplateInput!): EmailTemplate!
    deleteEmailTemplate(template_id: ID!): Boolean!
    sendTestEmail(template_id: ID!, to: String!, vars: String): EmailTestResult!
  }
`;
