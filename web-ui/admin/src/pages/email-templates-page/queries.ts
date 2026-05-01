import { gql } from '@apollo/client';

export const TEMPLATES = gql`
  query EmailTemplates {
    emailTemplates {
      template_id
      slug
      name
      description
      subject
      mjml
      variables {
        key
        description
        sample
      }
      is_active
      updated_at
    }
  }
`;

export const RENDER = gql`
  query RenderTpl($mjml: String!, $vars: String) {
    renderEmailTemplate(mjml: $mjml, vars: $vars) {
      html
      errors
      detected_variables
    }
  }
`;

export const CREATE = gql`
  mutation CreateTpl($input: CreateEmailTemplateInput!) {
    createEmailTemplate(input: $input) {
      template_id
    }
  }
`;
export const UPDATE = gql`
  mutation UpdateTpl($id: ID!, $input: UpdateEmailTemplateInput!) {
    updateEmailTemplate(template_id: $id, input: $input) {
      template_id
    }
  }
`;
export const DELETE = gql`
  mutation DeleteTpl($id: ID!) {
    deleteEmailTemplate(template_id: $id)
  }
`;
export const SEND_TEST = gql`
  mutation SendTest($id: ID!, $to: String!, $vars: String) {
    sendTestEmail(template_id: $id, to: $to, vars: $vars) {
      ok
      message
    }
  }
`;

export const STARTER = `<mjml>
  <mj-body>
    <mj-section background-color="#ffffff">
      <mj-column>
        <mj-text font-size="20px" font-weight="700">Hello {{ name }}</mj-text>
        <mj-text>Edit this template and click Preview.</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

export interface Tpl {
  template_id: string;
  slug: string;
  name: string;
  description?: string;
  subject: string;
  mjml: string;
  variables: { key: string; description?: string; sample?: string }[];
  is_active: boolean;
}
