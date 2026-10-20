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
    "Ships with Duncit, so resetEmailTemplate can put its shipped body back."
    is_shipped: Boolean!
    created_at: String
    updated_at: String
  }

  input CreateEmailTemplateInput {
    slug: String!
    name: String!
    description: String
    subject: String!
    "Omitted: the shipped starter body (emailStarterMjml)."
    mjml: String
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

  "One template's line in a header/footer connect run."
  type EmailFragmentPlanRow {
    slug: String!
    "The fragment it names (or would name); '(unmapped)' when none fits."
    category: String!
    note: String!
    "already | linked | stripped | skipped | no-fragment"
    action: String!
  }

  type EmailFragmentConnectResult {
    rows: [EmailFragmentPlanRow!]!
    "Templates that gained a header/footer — 0 on a dry run."
    connected: Int!
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
    """
    A sample body drawn with the shipped email design — what a new template
    starts from, and what the Fragments page previews a draft header and
    footer around.
    """
    emailStarterMjml: String!
  }

  extend type Mutation {
    createEmailTemplate(input: CreateEmailTemplateInput!): EmailTemplate!
    updateEmailTemplate(template_id: ID!, input: UpdateEmailTemplateInput!): EmailTemplate!
    deleteEmailTemplate(template_id: ID!): Boolean!
    """
    Put back the body Duncit ships for this template — the current design.
    Subject, fragment and footer sentence are left as they are.
    """
    resetEmailTemplate(template_id: ID!): EmailTemplate!
    """
    Connect every template that sends without a header/footer to its fragment:
    shipped templates follow their category, an admin's own template takes
    fallback_key (left alone without one). An old built-in logo/footer is
    stripped so nothing renders twice. dry_run reports without writing.
    """
    connectEmailTemplateFragments(fallback_key: String, dry_run: Boolean): EmailFragmentConnectResult!
    sendTestEmail(template_id: ID!, to: String!, vars: String): EmailTestResult!
  }
`;
