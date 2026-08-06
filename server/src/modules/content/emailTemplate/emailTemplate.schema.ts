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
    "The key of the header/footer fragment wrapping this body. Null renders it bare."
    fragment_key: String
    "This template's own footer sentence. Blank uses the category's generic one."
    footer_note: String
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
    fragment_key: String
    footer_note: String
    variables: [EmailTemplateVariableInput!]
    is_active: Boolean
  }

  input UpdateEmailTemplateInput {
    name: String
    description: String
    subject: String
    mjml: String
    fragment_key: String
    footer_note: String
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
    renderEmailTemplate(
      mjml: String!
      vars: String
      "Preview the body wrapped in this fragment's header and footer."
      fragment_key: String
      "The template's own footer sentence, so the preview shows it filled in."
      footer_note: String
    ): EmailTemplateRender!
  }

  extend type Mutation {
    createEmailTemplate(input: CreateEmailTemplateInput!): EmailTemplate!
    updateEmailTemplate(template_id: ID!, input: UpdateEmailTemplateInput!): EmailTemplate!
    deleteEmailTemplate(template_id: ID!): Boolean!
    sendTestEmail(template_id: ID!, to: String!, vars: String): EmailTestResult!
  }
`;
