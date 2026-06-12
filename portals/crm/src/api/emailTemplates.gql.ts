import { gql } from '@apollo/client';

export interface EmailTemplateVar {
  key: string;
  description?: string | null;
  sample?: string | null;
}

export interface EmailAsset {
  url: string;
  name?: string | null;
}

export type EmailTemplateTarget = 'VENUE' | 'HOST' | 'ECOMM' | 'STATIC';

export interface EmailTemplate {
  template_id: string;
  slug: string;
  name: string;
  description?: string | null;
  subject: string;
  target: EmailTemplateTarget;
  mjml: string;
  variables: EmailTemplateVar[];
  images: EmailAsset[];
  attachments: EmailAsset[];
  is_active: boolean;
  updated_at?: string | null;
}

// CRM email templates live in a dedicated CRM store (crm* operations), kept
// fully separate from the core/admin EmailTemplate collection. Server fields
// are aliased back to the original names so the UI keeps using `emailTemplates`,
// `renderEmailTemplate`, etc.
const TEMPLATE_FIELDS = `
  template_id
  slug
  name
  description
  subject
  target
  mjml
  variables { key description sample }
  images { url name }
  attachments { url name }
  is_active
  updated_at
`;

export const TEMPLATES = gql`
  query CrmEmailTemplates {
    emailTemplates: crmEmailTemplates { ${TEMPLATE_FIELDS} }
  }
`;

export const EMAIL_TEMPLATE = gql`
  query CrmEmailTemplate($id: ID!) {
    emailTemplate: crmEmailTemplate(template_id: $id) { ${TEMPLATE_FIELDS} }
  }
`;

export const RENDER = gql`
  query RenderCrmEmailTemplate($mjml: String!, $vars: String) {
    renderEmailTemplate: renderCrmEmailTemplate(mjml: $mjml, vars: $vars) {
      html
      errors
      detected_variables
    }
  }
`;

export const CREATE = gql`
  mutation CreateCrmEmailTemplate($input: CreateCrmEmailTemplateInput!) {
    createEmailTemplate: createCrmEmailTemplate(input: $input) { template_id }
  }
`;

export const UPDATE = gql`
  mutation UpdateCrmEmailTemplate($id: ID!, $input: UpdateCrmEmailTemplateInput!) {
    updateEmailTemplate: updateCrmEmailTemplate(template_id: $id, input: $input) { template_id }
  }
`;

export const DELETE = gql`
  mutation DeleteCrmEmailTemplate($id: ID!) {
    deleteEmailTemplate: deleteCrmEmailTemplate(template_id: $id)
  }
`;

export const SEND_TEST = gql`
  mutation SendCrmTestEmail($id: ID!, $to: String!, $vars: String) {
    sendTestEmail: sendCrmTestEmail(template_id: $id, to: $to, vars: $vars) { ok message }
  }
`;

export const ADD_TEMPLATE_IMAGE = gql`
  mutation AddCrmEmailTemplateImage($id: ID!, $image: CrmEmailAssetInput!) {
    addCrmEmailTemplateImage(template_id: $id, image: $image) { template_id images { url name } }
  }
`;

export const REMOVE_TEMPLATE_IMAGE = gql`
  mutation RemoveCrmEmailTemplateImage($id: ID!, $url: String!) {
    removeCrmEmailTemplateImage(template_id: $id, url: $url) { template_id images { url name } }
  }
`;

export const AI_MJML = gql`
  mutation AiCreateOrUpdateMjml($input: AiMjmlTemplateInput!) {
    aiCreateOrUpdateMjml(input: $input)
  }
`;

export const STARTER_MJML = `<mjml>
  <mj-body>
    <mj-section background-color="#ffffff">
      <mj-column>
        <mj-text font-size="20px" font-weight="700">Hello {{ name }}</mj-text>
        <mj-text>Edit this template and watch the preview update.</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;
